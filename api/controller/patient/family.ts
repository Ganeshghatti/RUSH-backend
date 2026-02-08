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
import { DeleteMediaFromS3 } from "../../utils/aws_s3/delete-media";

// Add a new family
export const addFamily = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    const validationResult = addFamilySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Please check the family member details and try again.",
        action: "addFamily:validation-error",
        data: {
          errors: validationResult.error.errors,
        },
      });
      return;
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "addFamily:patient-not-found",
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
      message: "Family member added successfully.",
      action: "addFamily:success",
      data: familyWithUrls,
    });
  } catch (error) {
    console.error("Error adding family member:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't add the family member.",
      action: error instanceof Error ? error.message : String(error),
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
        message: "The family ID provided is invalid.",
        action: "updateFamily:validate-family-id",
      });
      return;
    }
    const validationResult = updateFamilySchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Please check the family member details and try again.",
        action: "updateFamily:validation-error",
        data: {
          errors: validationResult.error.errors,
        },
      });
      return;
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "updateFamily:patient-not-found",
      });
      return;
    }

    const validatedData = validationResult.data;
    if (validatedData.idProof?.idImage && validatedData.idProof.idImage.includes("https://")) {
      const key = await getKeyFromSignedUrl(validatedData.idProof.idImage);
      validatedData.idProof.idImage = key ?? validatedData.idProof.idImage;
    }
    if (validatedData.insurance && Array.isArray(validatedData.insurance)) {
      for (const item of validatedData.insurance) {
        if (item.image && item.image.includes("https://")) {
          const key = await getKeyFromSignedUrl(item.image);
          item.image = key ?? undefined;
        }
      }
    }

    const existingFamily = await Family.findOne({
      _id: familyId,
      patientId: patient._id,
    });
    const newIdImageKey = validatedData.idProof?.idImage;
    const newInsuranceImageKeys = new Set(
      (validatedData.insurance ?? [])
        .map((i: { image?: string }) => i?.image)
        .filter(Boolean) as string[]
    );
    if (existingFamily) {
      if (
        existingFamily.idProof?.idImage &&
        newIdImageKey &&
        existingFamily.idProof.idImage !== newIdImageKey
      ) {
        try {
          await DeleteMediaFromS3({ key: existingFamily.idProof.idImage });
        } catch (err) {
          console.warn("Failed to delete old family idProof image from S3:", err);
        }
      }
      if (Array.isArray(existingFamily.insurance)) {
        for (const item of existingFamily.insurance) {
          const oldKey = item?.image;
          if (oldKey && !newInsuranceImageKeys.has(oldKey)) {
            try {
              await DeleteMediaFromS3({ key: oldKey });
            } catch (err) {
              console.warn("Failed to delete old family insurance image from S3:", err);
            }
          }
        }
      }
    }

    // Flatten nested payload to dot-notation for $set so only provided nested fields are updated (e.g. { basicDetails: { name: "x" } } → { "basicDetails.name": "x" }).
    const flattenedData: Record<string, unknown> = {};
    const flatten = (obj: Record<string, unknown>, parentKey = "") => {
      for (const key in obj) {
        const propName = parentKey ? `${parentKey}.${key}` : key;
        const val = obj[key];
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          flatten(val as Record<string, unknown>, propName);
        } else {
          flattenedData[propName] = val;
        }
      }
    };
    flatten(validatedData as Record<string, unknown>);
    const updatedFamily = await Family.findOneAndUpdate(
      { _id: familyId, patientId: patient._id },
      { $set: flattenedData },
      { new: true, runValidators: true }
    );

    if (!updatedFamily) {
      res.status(404).json({
        success: false,
        message: "We couldn't find that family member or you don't have access.",
        action: "updateFamily:family-not-found",
      });
      return;
    }

    const familyWithUrls = await generateSignedUrlsForFamily(updatedFamily);

    res.status(200).json({
      success: true,
      message: "Family member updated successfully.",
      action: "updateFamily:success",
      data: familyWithUrls,
    });
  } catch (error) {
    console.error("Error updating family member:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the family member.",
      action: error instanceof Error ? error.message : String(error),
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
        message: "The family ID provided is invalid.",
        action: "removeFamily:validate-family-id",
      });
      return;
    }

    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your patient profile.",
        action: "removeFamily:patient-not-found",
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
        message: "We couldn't find that family member or you don't have access.",
        action: "removeFamily:family-not-found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Family member removed successfully.",
      action: "removeFamily:success",
    });
  } catch (error) {
    console.error("Error removing family member:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't remove the family member.",
      action: error instanceof Error ? error.message : String(error),
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
        message: "We couldn't find your patient profile.",
        action: "getFamilyDetails:patient-not-found",
      });
      return;
    }

    const families = await Family.find({ patientId: patient._id });
    const familiesWithUrls: any[] = await generateSignedUrlsForFamilies(
      families
    );

    res.status(200).json({
      success: true,
      message: "Family details fetched successfully.",
      action: "getFamilyDetails:success",
      data: familiesWithUrls,
    });
  } catch (error) {
    console.error("Error fetching family details:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't fetch family details right now.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
