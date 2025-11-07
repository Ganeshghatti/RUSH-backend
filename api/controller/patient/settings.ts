import User from "../../models/user/user-model";
import { Request, Response } from "express";
import { getKeyFromSignedUrl } from "../../utils/aws_s3/upload-media";

export const updatePersonalInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const {
      profilePic,
      firstName,
      lastName,
      email,
      phone,
      dob,
      gender,
      address,
    } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profilePic,
        firstName,
        lastName,
        email,
        phone,
        dob,
        gender,
        address,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the requested user.",
        action: "updatePersonalInfo:user-not-found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Your personal information has been updated.",
      action: "updatePersonalInfo:success",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Error updating personal info:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update your personal information.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateIdentityProof = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    const { personalIdProof, addressProof, taxProof } = req.body;
    if (!personalIdProof || !addressProof || !taxProof) {
      res.status(400).json({
        success: false,
        message:
          "Please provide personal ID, address, and tax proofs to continue.",
        action: "updateIdentityProof:validate-missing-proof",
      });
      return;
    }

    // make sure we are saving S3 key in the DB not urls
      if(personalIdProof.image && personalIdProof.image.includes('https://')) 
        personalIdProof.image = await getKeyFromSignedUrl(personalIdProof.image);
      if(addressProof.image && addressProof.image.includes('https://')) 
        addressProof.image = await getKeyFromSignedUrl(addressProof.image);
      if(taxProof.image && taxProof.image.includes('https://')) 
        taxProof.image = await getKeyFromSignedUrl(taxProof.image);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          personalIdProof: personalIdProof,
          addressProof: addressProof,
          taxProof: taxProof,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the requested user.",
        action: "updateIdentityProof:user-not-found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Identity proofs updated successfully.",
      action: "updateIdentityProof:success",
      data: {
        personalIdProof: updatedUser.personalIdProof,
        addressProof: updatedUser.addressProof,
        taxProof: updatedUser.taxProof,
      },
    });
  } catch (err: any) {
    console.error("Error updating identity proofs:", err);

    if (err.name === "ValidationError") {
      res.status(400).json({
        success: false,
        message: "Some of the provided proof details are invalid.",
        action: "updateIdentityProof:validation-error",
        data: {
          errors: err.errors,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "We couldn't update your identity proofs.",
      action: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateInsuranceDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Expect an array of insurance details from the frontend
    const { insuranceDetails } = req.body;
    if (!Array.isArray(insuranceDetails)) {
      res.status(400).json({
        success: false,
        message: "Insurance details must be provided as a list.",
        action: "updateInsuranceDetails:validate-array",
      });
      return;
    }

    // find the user and update the insuranceDetails array entirly.
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: { insuranceDetails: insuranceDetails },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the requested user.",
        action: "updateInsuranceDetails:user-not-found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Insurance details updated successfully.",
      action: "updateInsuranceDetails:success",
      data: user.insuranceDetails,
    });
  } catch (err) {
    console.error("Error updating insurance details:", err);
    res.status(500).json({
      success: false,
      message: "We couldn't update the insurance details.",
      action: err instanceof Error ? err.message : String(err),
    });
  }
};

export const updateBankDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    const updateData = req.body;
    if (!updateData || Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "Please share the bank details you want to save.",
        action: "updateBankDetail:validate-missing-details",
      });
      return;
    }

    const updateFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      updateFields[`bankDetails.${key}`] = value;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true, select: "-password" }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the requested user.",
        action: "updateBankDetail:user-not-found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      action: "updateBankDetail:success",
      data: updatedUser.bankDetails, 
    });
  } catch (error: any) {
    console.error("Error updating bank details:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the bank details.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
