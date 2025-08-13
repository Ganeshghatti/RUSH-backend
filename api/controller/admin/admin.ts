import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import { generateSignedUrlsForUser } from "../../utils/signed-url";

export const getAllDoctors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Find all users who are doctors and populate their doctor data (excluding password)
    const users = await User.find({ roles: "doctor" }).populate({
      path: "roleRefs.doctor",
      select: "-password",
    });

    if (!users || users.length === 0) {
      res.status(404).json({
        success: false,
        message: "No doctor accounts found",
      });
      return;
    }

    // Generate signed URLs for all users
    const usersWithSignedUrls = await Promise.all(
      users.map((user) => generateSignedUrlsForUser(user))
    );

    res.status(200).json({
      success: true,
      message: "Doctor accounts fetched successfully",
      data: usersWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching doctor accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor accounts",
    });
  }
};

export const getAllPatients = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Find all users who are patients and populate their patient data (excluding password)
    const users = await User.find({ roles: "patient" }).populate({
      path: "roleRefs.patient",
      select: "-password",
    });

    if (!users || users.length === 0) {
      res.status(404).json({
        success: false,
        message: "No patient accounts found",
      });
      return;
    }

    // Filter out users where patient role ref failed to populate and generate signed URLs for basic user data only
    const validUsers = users.filter(
      (user) =>
        user.roleRefs?.patient && typeof user.roleRefs.patient === "object"
    );

    const usersWithSignedUrls = await Promise.all(
      validUsers.map(async (user) => {
        // Create a clone and only process basic user fields to avoid the signed URL error
        const clone = JSON.parse(JSON.stringify(user));

        // Only handle profile picture for now
        if (clone?.profilePic) {
          try {
            const { GetSignedUrl } = await import(
              "../../utils/aws_s3/upload-media"
            );
            clone.profilePic = await GetSignedUrl(clone.profilePic);
          } catch (error) {
            console.warn(
              "Could not generate signed URL for profile pic:",
              error
            );
          }
        }

        return clone;
      })
    );

    res.status(200).json({
      success: true,
      message: "Patient accounts fetched successfully",
      data: usersWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching patient accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient accounts",
    });
  }
};

export const updateDoctorStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { status, message } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
      return;
    }

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        $set: { status },
        $push: { message: { message, date: new Date() } },
      },
      { new: true, select: "-password" }
    );

    if (!updatedDoctor) {
      res.status(404).json({
        success: false,
        message: "Doctor account not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Doctor status updated successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    console.error("Error updating doctor status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update doctor status",
    });
  }
};

export const updateDocumentVerificationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  const { isDocumentVerified } = req.body;

  if (typeof isDocumentVerified !== "boolean") {
    res.status(400).json({
      success: false,
      message: "`isDocumentVerified` must be a boolean value.",
    });
    return;
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isDocumentVerified },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User verification status updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating verification status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update document verification status",
    });
  }
};
