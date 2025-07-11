import Patient from "../../models/user/patient-model";
import Family from "../../models/user/family-model";
import {
  addFamilySchema,
  updateFamilySchema,
} from "../../validation/validation";
import {
  generateSignedUrlsForFamily,
  generateSignedUrlsForFamilies,
} from "../../utils/signed-url";
import { Request, Response } from "express";
import mongoose from "mongoose";

export const addFamily = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const validationResult = addFamilySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const newFamily = new Family({
      patientId: patient._id,
      ...validationResult.data,
    });

    const savedFamily = await newFamily.save();

    const familyWithUrls = await generateSignedUrlsForFamily(savedFamily);

    res.status(201).json({
      success: true,
      message: "Family member added successfully",
      data: familyWithUrls,
    });
  } catch (error) {
    console.error("Error adding family member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add family member",
    });
  }
};

export const updateFamily = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { familyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      res.status(400).json({
        success: false,
        message: "Invalid family ID format",
      });
      return;
    }

    const validationResult = updateFamilySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const updatedFamily = await Family.findOneAndUpdate(
      { _id: familyId, patientId: patient._id },
      { $set: validationResult.data },
      { new: true, runValidators: true }
    );

    if (!updatedFamily) {
      res.status(404).json({
        success: false,
        message: "Family member not found or not authorized",
      });
      return;
    }

    const familyWithUrls = await generateSignedUrlsForFamily(updatedFamily);

    res.status(200).json({
      success: true,
      message: "Family member updated successfully",
      data: familyWithUrls,
    });
  } catch (error) {
    console.error("Error updating family member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update family member",
    });
  }
};

export const removeFamily = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { familyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(familyId)) {
      res.status(400).json({
        success: false,
        message: "Invalid family ID format",
      });
      return;
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const deletedFamily = await Family.findOneAndDelete({
      _id: familyId,
      patientId: patient._id,
    });

    if (!deletedFamily) {
      res.status(404).json({
        success: false,
        message: "Family member not found or not authorized",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Family member removed successfully",
    });
  } catch (error) {
    console.error("Error removing family member:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove family member",
    });
  }
};

export const getFamilyDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const families = await Family.find({ patientId: patient._id });

    const familiesWithUrls: any[] = await generateSignedUrlsForFamilies(
      families
    );

    res.status(200).json({
      success: true,
      message: "Family details fetched successfully",
      data: familiesWithUrls,
    });
  } catch (error) {
    console.error("Error fetching family details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch family details",
    });
  }
};
