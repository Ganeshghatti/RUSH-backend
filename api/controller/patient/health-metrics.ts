import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Family from "../../models/user/family-model";
import { HealthMetrics } from "../../models/health-metrics-model";
import { healthMetricsSchemaZod } from "../../validation/validation";

// get health metrics by ID
export const getHealthMetricsById = async (req: Request, res: Response): Promise<void> => {
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
export const addHealthMetrics = async (req: Request, res: Response): Promise<void> => {
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

    const { familyId, ...rest } = validationResult.data;
    const ownerType = familyId ? "Family" : "Patient";

    console.log("VALIDATION..... ",validationResult.data)
    let existingMetrics;

    //***** if ownerType is family *****\\
    if (familyId) {
      // find the family
      const family = await Family.findOne({ _id: familyId, patientId: patient._id });
      console.log("Family..... ",family)
      if (!family) {
        res.status(400).json({
          success: false,
          message: "Invalid family ID or not authorized",
        });
        return;
      }
      console.log("RESTTTT ",rest)
      if (family.basicDetails.gender !== "Female") {
        delete rest.femaleHealth;
      }

      // check if family already has a linked health metrices
      if (family.healthMetricsId) {
        console.log("Hi")
        existingMetrics = await HealthMetrics.findByIdAndUpdate(
          family.healthMetricsId,
          {
            ...rest,
            ownerType,
            patientId: patient._id,
            familyId,
          },
          { new: true }
        );
      } 
      // if not the create a new health metrices document
      else {
        console.log("Hello")
        const newMetrics = new HealthMetrics({
          patientId: patient._id,
          ownerType,
          familyId,
          ...rest,
        });
        existingMetrics = await newMetrics.save();
        console.log("Exist metric.... ",existingMetrics)

        // update the healthMetricesId key in the family document
        family.healthMetricsId = existingMetrics._id;
        await family.save();
        console.log("final family ",family)
      }
    } 
    //***** if ownerType is patient ******\\
    else {
      const user = await User.findById(userId);
      if (user?.gender !== "Female") {
        delete rest.femaleHealth;
      }
      existingMetrics = new HealthMetrics({
        patientId: patient._id,
        ownerType,
        ...rest,
      });
      existingMetrics = await existingMetrics.save();
    }

    res.status(201).json({
      success: true,
      message: familyId
        ? "Family Health Metrics saved successfully"
        : "Patient Health Metrics saved successfully",
      data: existingMetrics,
    });
  } catch (error) {
    console.error("Error adding/updating health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add or update health metrics",
    });
  }
};
