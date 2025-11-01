import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Family from "../../models/user/family-model";
import { HealthMetrics } from "../../models/health-metrics-model";
import { healthMetricsSchemaZod } from "../../validation/validation";

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
        message: "Patient not found",
      });
      return;
    }

    // check if patient has healthMetricsId
    if (!patient.healthMetricsId) {
      res.status(404).json({
        success: false,
        message: "No health metrics associated with this patient",
      });
      return;
    }

    const healthMetrics = await HealthMetrics.findById(patient.healthMetricsId);
    if (!healthMetrics) {
      res.status(404).json({
        success: false,
        message: "Health Metrics not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Health Metrics fetched successfully",
      data: healthMetrics,
    });
  } catch (error) {
    console.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch health metrics",
    });
  }
};

// get health metrics by ID
export const getHealthMetricsById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { healthMetricsId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(healthMetricsId)) {
      res.status(400).json({
        success: false,
        message: "Invalid Health Metrics ID format",
      });
      return;
    }

    const healthMetrics = await HealthMetrics.findById(healthMetricsId);
    //   .populate("patientId", "name email")
    //   .populate("familyId", "basicDetails.name relationship");
    if (!healthMetrics) {
      res.status(404).json({
        success: false,
        message: "Health Metrics not found",
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Health Metrics fetched successfully",
      data: healthMetrics,
    });
  } catch (error) {
    console.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch health metrics",
    });
  }
};

// add new health Metrics (for patient or family)
export const addHealthMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // validate input
    const validationResult = healthMetricsSchemaZod.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    //finding the patient linked with this userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const { familyMemberId, ...rest } = validationResult.data;
    const payload: any = { ...rest };
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
          message: "Invalid family ID or not authorized",
        });
        return;
      }

      if (family.basicDetails.gender !== "Female") {
        delete payload.femaleHealth;
      }

      // if family already has a linked health metrices update it
      if (family.healthMetricsId) {
        const updated = await HealthMetrics.findByIdAndUpdate(
          family.healthMetricsId,
          {
            $set: {
              ...payload,
              ownerType,
              patientId: patient._id,
              familyMemberId,
            },
          },
          { new: true, runValidators: true }
        );
        if (!updated) {
          res.status(500).json({
            success: false,
            message: "Failed to update family health metrics",
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: "Family health metrics updated successfully",
          data: updated,
        });
        return;
      }

      // if not the create a new health metrices document
      const newMetrics = new HealthMetrics({
        patientId: patient._id,
        ownerType,
        familyMemberId,
        ...payload,
      });
      const saved = await newMetrics.save();

      // update the healthMetricesId key in the family document
      family.healthMetricsId = saved._id;
      await family.save();

      res.status(201).json({
        success: true,
        message: "Family health metrics created successfully",
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
          message: "Failed to update patient health metrics",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Patient health metrics updated successfully",
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
      message: "Patient health metrics created successfully",
      data: saved,
    });
  } catch (error) {
    console.error("Error adding/updating health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add or update health metrics",
    });
  }
};
