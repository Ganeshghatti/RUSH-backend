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
import { getKeyFromSignedUrl } from "../../utils/aws_s3/upload-media";

// useful for partial update
type AnyObject = Record<string, any>;
const flattenObject = (obj: AnyObject, parentKey = "", res: AnyObject = {}) => {
  for (const key in obj) {
    const propName = parentKey ? `${parentKey}.${key}` : key;
    if (typeof obj[key] === "object" && !Array.isArray(obj[key]) && obj[key] !== null) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
};

// Add a new family
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
    // console.log("Family with url ",familyWithUrls);

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

// update an existing family
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
    console.log("Req.boyd ",req.body)
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

    const validatedData = validationResult.data;
    console.log('Validated data')
    if (validatedData.insurance && Array.isArray(validatedData.insurance)){
      for (const item of validatedData.insurance) {
        if (item.image && item.image.includes("https://")) {
          console.log("Hello there ",item.image)
          const key = await getKeyFromSignedUrl(item.image);
          console.log("hey ",key)
          item.image = key ?? undefined;
        }
      }
    }
    const flattenedData = flattenObject(validatedData);
    console.log("Flattened data ",flattenedData)
    const updatedFamily = await Family.findOneAndUpdate(
      { _id: familyId, patientId: patient._id },
      { $set: flattenedData},// set operator tells db only update the fields present in this object.
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

// delete a family
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

// get all the family
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
