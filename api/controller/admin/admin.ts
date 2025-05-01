import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";

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
      { status, message },
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
