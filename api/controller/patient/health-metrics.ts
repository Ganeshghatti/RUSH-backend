import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Family from "../../models/user/family-model";
import { HealthMetrics } from "../../models/health-metrics-model";
import { healthMetricsSchemaZod } from "../../validation/validation";
import { GetSignedUrl, getKeyFromSignedUrl } from "../../utils/aws_s3/upload-media";
import { DeleteMediaFromS3 } from "../../utils/aws_s3/delete-media";

// get health metrics for patient
export const getHealthMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    //finding the patient linked with this userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "getHealthMetrics:patient-not-found",
      });
      return;
    }

    // check if patient has healthMetricsId
    if (!patient.healthMetricsId) {
      res.status(200).json({
        success: true,
        message: "No health metrics are associated with this patient yet.",
        action: "getHealthMetrics:metrics-missing",
      });
      return;
    }

    const healthMetrics = await HealthMetrics.findById(patient.healthMetricsId);
    if (!healthMetrics) {
      res.status(404).json({
        success: false,
        message: "We couldn't find health metrics for this patient.",
        action: "getHealthMetrics:metrics-not-found",
      });
      return;
    }
    if (
      healthMetrics?.medicalHistory &&
      healthMetrics.medicalHistory.length > 0
    ) {
      const updatedMedicalHistory = await Promise.all(
        healthMetrics.medicalHistory.map(async (history: any) => {
          if (history.reports) {
            try {
              const signedUrl = await GetSignedUrl(history.reports);
              return {
                ...(history.toObject?.() ?? history),
                reports: signedUrl,
              };
            } catch (err) {
              console.error("Error generating signed URL:", err);
              return history;
            }
          }
          return history;
        })
      );
      (healthMetrics as any).medicalHistory = updatedMedicalHistory;
    }

    res.status(200).json({
      success: true,
      message: "Health metrics fetched successfully.",
      action: "getHealthMetrics:success",
      data: healthMetrics,
    });
  } catch (error) {
    console.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't fetch the health metrics right now.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// get health metrics by ID (must belong to current patient or their family)
export const getHealthMetricsById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { healthMetricsId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(healthMetricsId)) {
      res.status(400).json({
        success: false,
        message: "The health metrics ID provided is invalid.",
        action: "getHealthMetricsById:validate-id",
      });
      return;
    }

    const healthMetrics = await HealthMetrics.findById(healthMetricsId);
    if (!healthMetrics) {
      res.status(404).json({
        success: false,
        message: "We couldn't find health metrics with that ID.",
        action: "getHealthMetricsById:metrics-not-found",
      });
      return;
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "getHealthMetricsById:patient-not-found",
      });
      return;
    }

    const patientIdStr = patient._id.toString();
    const metricsPatientId = healthMetrics.patientId?.toString?.();
    if (metricsPatientId !== patientIdStr) {
      res.status(403).json({
        success: false,
        message: "You don't have access to these health metrics.",
        action: "getHealthMetricsById:forbidden",
      });
      return;
    }

    if (healthMetrics.ownerType === "Family" && healthMetrics.familyId) {
      const family = await Family.findOne({
        _id: healthMetrics.familyId,
        patientId: patient._id,
      });
      if (!family) {
        res.status(403).json({
          success: false,
          message: "You don't have access to these health metrics.",
          action: "getHealthMetricsById:forbidden",
        });
        return;
      }
    }
    if (
      healthMetrics?.medicalHistory &&
      healthMetrics.medicalHistory.length > 0
    ) {
      const updatedMedicalHistory = await Promise.all(
        healthMetrics.medicalHistory.map(async (history: any) => {
          if (history.reports) {
            try {
              const signedUrl = await GetSignedUrl(history.reports);
              return {
                ...(history.toObject?.() ?? history),
                reports: signedUrl,
              };
            } catch (err) {
              console.error("Error generating signed URL:", err);
              return history;
            }
          }
          return history;
        })
      );
      (healthMetrics as any).medicalHistory = updatedMedicalHistory;
    }
    res.status(200).json({
      success: true,
      message: "Health metrics fetched successfully.",
      action: "getHealthMetricsById:success",
      data: healthMetrics,
    });
  } catch (error) {
    console.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't fetch the health metrics right now.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

// Create or update health metrics (for patient or family)
export const addOrUpdateHealthMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // validate input (strip document metadata like createdAt, updatedAt, __v via schema .strip())
    const validationResult = healthMetricsSchemaZod.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Please review the health metrics details and try again.",
        action: "addOrUpdateHealthMetrics:validation-error",
        data: {
          errors: validationResult.error.errors,
        },
      });
      return;
    }

    //finding the patient linked with this userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "addOrUpdateHealthMetrics:patient-not-found",
      });
      return;
    }

    const { familyMemberId, ...rest } = validationResult.data;
    const payload: any = { ...rest };

    // Store only S3 keys for reports, not full URLs (client may send back presigned URLs from GET)
    if (payload.medicalHistory && Array.isArray(payload.medicalHistory)) {
      for (const entry of payload.medicalHistory) {
        if (entry.reports && typeof entry.reports === "string" && entry.reports.includes("https://")) {
          const key = await getKeyFromSignedUrl(entry.reports);
          entry.reports = key ?? entry.reports;
        }
      }
    }

    const ownerType = familyMemberId ? "Family" : "Patient";

    //***** if ownerType is family *****\\
    if (familyMemberId) {
      // find the family
      const family = await Family.findOne({
        _id: familyMemberId,
        patientId: patient._id,
      });
      if (!family) {
        res.status(400).json({
          success: false,
          message: "We couldn't verify that family member.",
          action: "addOrUpdateHealthMetrics:family-not-authorized",
        });
        return;
      }

      if (family.basicDetails.gender !== "Female") {
        delete payload.femaleHealth;
      }

      // if family already has a linked health metrices update it
      if (family.healthMetricsId) {
        const existing = await HealthMetrics.findById(family.healthMetricsId).lean();
        const newReportKeys = new Set(
          (payload.medicalHistory ?? [])
            .map((h: { reports?: string }) => h?.reports)
            .filter(Boolean) as string[]
        );
        if (existing?.medicalHistory?.length) {
          for (const h of existing.medicalHistory) {
            const oldKey = (h as { reports?: string }).reports;
            if (oldKey && !newReportKeys.has(oldKey)) {
              try {
                await DeleteMediaFromS3({ key: oldKey });
              } catch (err) {
                console.warn("Failed to delete old health metrics report from S3:", err);
              }
            }
          }
        }
        const updated = await HealthMetrics.findByIdAndUpdate(
          family.healthMetricsId,
          {
            $set: {
              ...payload,
              ownerType,
              patientId: patient._id,
              familyId: familyMemberId,
            },
          },
          { new: true, runValidators: true }
        );
        if (!updated) {
          res.status(500).json({
            success: false,
            message: "We couldn't update the family health metrics.",
            action: "addOrUpdateHealthMetrics:update-family-failed",
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: "Family health metrics updated successfully.",
          action: "addOrUpdateHealthMetrics:update-family-success",
          data: updated,
        });
        return;
      }

      // if not the create a new health metrices document
      const newMetrics = new HealthMetrics({
        patientId: patient._id,
        ownerType,
        familyId: familyMemberId,
        ...payload,
      });
      const saved = await newMetrics.save();

      // update the healthMetricesId key in the family document
      family.healthMetricsId = saved._id;
      await family.save();

      res.status(201).json({
        success: true,
        message: "Family health metrics created successfully.",
        action: "addOrUpdateHealthMetrics:create-family-success",
        data: saved,
      });
      return;
    }

    //***** if ownerType is patient ******\\
    const user = await User.findById(userId);
    if (user?.gender !== "Female") {
      delete rest.femaleHealth;
    }

    //if patient already has healthMetrics update it
    if (patient.healthMetricsId) {
      const existing = await HealthMetrics.findById(patient.healthMetricsId).lean();
      const newReportKeys = new Set(
        (payload.medicalHistory ?? [])
          .map((h: { reports?: string }) => h?.reports)
          .filter(Boolean) as string[]
      );
      if (existing?.medicalHistory?.length) {
        for (const h of existing.medicalHistory) {
          const oldKey = (h as { reports?: string }).reports;
          if (oldKey && !newReportKeys.has(oldKey)) {
            try {
              await DeleteMediaFromS3({ key: oldKey });
            } catch (err) {
              console.warn("Failed to delete old health metrics report from S3:", err);
            }
          }
        }
      }
      const updated = await HealthMetrics.findByIdAndUpdate(
        patient.healthMetricsId,
        {
          $set: {
            ...payload,
            ownerType,
            patientId: patient._id,
          },
        },
        { new: true, runValidators: true }
      );
      if (!updated) {
        res.status(500).json({
          success: false,
          message: "We couldn't update the patient health metrics.",
          action: "addOrUpdateHealthMetrics:update-patient-failed",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Patient health metrics updated successfully.",
        action: "addOrUpdateHealthMetrics:update-patient-success",
        data: updated,
      });
      return;
    }

    const newMetrics = new HealthMetrics({
      patientId: patient._id,
      ownerType,
      ...payload,
    });
    const saved = await newMetrics.save();

    patient.healthMetricsId = saved._id;
    await patient.save();

    res.status(201).json({
      success: true,
      message: "Patient health metrics created successfully.",
      action: "addOrUpdateHealthMetrics:create-patient-success",
      data: saved,
    });
  } catch (error) {
    console.error("Error adding/updating health metrics:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't add or update the health metrics.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
