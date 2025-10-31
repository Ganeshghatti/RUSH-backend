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
        message: "User not found",
      });
      return;
    }

    res.json({
      message: "Personal info updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating personal info:", error);
    res.status(500).json({ message: "Server error" });
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
          "Incomplete data. Please provide personalIdProof, addressProof, and taxProof.",
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
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Identity proofs updated successfully.",
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
        message: "Validation failed.",
        errors: err.errors,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Server error. Could not update identity proofs.",
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
        message: "insuranceDetails must be an array.",
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
      res.status(404).json({ success: false, message: "User not found." });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Insurance details updated successfully.",
      data: user.insuranceDetails,
    });
  } catch (err) {
    console.error("Error updating insurance details:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error. Please try again." });
  }
};

export const updateBankDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    const { bankDetails } = req.body;
    if (!bankDetails || Object.keys(bankDetails).length === 0) {
      res.status(400).json({
        success: false,
        message: "No bank details provided",
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { bankDetails } },
      { new: true, runValidators: true, select: "-password" }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: updatedUser.bankDetails, // return just bankDetails
    });
  } catch (error: any) {
    console.error("Error updating bank details:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bank details",
      error: error.message,
    });
  }
};
