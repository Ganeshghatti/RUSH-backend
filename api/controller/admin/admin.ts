import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";

export const getAllDoctors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctors = await Doctor.find({});

    if (!doctors || doctors.length === 0) {
      res.status(404).json({
        success: false,
        message: "No doctor accounts found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Doctor accounts fetched successfully",
      data: doctors,
    });
  } catch (error) {
    console.error("Error fetching doctor accounts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor accounts",
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
        $push: { message: { message, date: new Date() } }
      },
      { new: true }
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