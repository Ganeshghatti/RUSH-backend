import { Request, Response } from "express";
import mongoose from "mongoose";
import { RatingModel } from "../../models/appointment/rating-model";
import { ratingSchemaZod } from "../../validation/validation";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";

export const getMyRatings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Hi");
    const userId = req.user.id;

    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found for this user",
      });
      return;
    }

    const ratings = await RatingModel.find({
      doctorId: doctor._id,
    })
      .populate({
        path: "patientId",
        populate: {
          path: "userId",
          select: "firstName lastName profilePic",
        },
      })
      .sort({ createdAt: -1 });

    console.log("Ratings ", ratings);

    res.status(200).json({
      success: true,
      message: "Doctor's ratings fetched successfully",
      data: ratings,
    });
  } catch (error) {
    console.error("Error fetching doctor's own ratings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor's ratings",
    });
  }
};

// get all ratings by doctorId to show on doctor profile.
export const getRatingsByDoctorId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid Doctor ID format",
      });
      return;
    }

    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      res.status(400).json({
        success: false,
        message: "Doctor with this userId not found.",
      });
      return;
    }
    const doctorId = doctor._id;
    const ratings = await RatingModel.find({
      doctorId,
      isEnable: true,
    })
      .populate({
        path: "patientId",
        populate: {
          path: "userId",
          select: "firstName lastName profilePic",
        },
      })
      .sort({ createdAt: -1 });

    console.log("Ratings ", ratings);

    res.status(200).json({
      success: true,
      message: "Ratings fetched successfully",
      data: ratings,
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ratings",
    });
  }
};

// patient add new rating to an appointment
export const addRating = async (req: Request, res: Response): Promise<void> => {
  try {
    const patientUserId = req.user.id;

    // validate input
    const validationResult = ratingSchemaZod.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }
    const { appointmentId, appointmentTypeRef, doctorId, rating, review } =
      validationResult.data;

    // see if the patientId exist.
    const patient = await Patient.findOne({ userId: patientUserId });
    if (!patient) {
      res.status(400).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // see if the doctorId exist.
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(400).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // see if appointment exist.
    const AppointmentModel = mongoose.model(appointmentTypeRef);
    const appointment = await AppointmentModel.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
      return;
    }
    if (
      !appointment.patientId.equals(patient.userId) ||
      !appointment.doctorId.equals(doctor._id)
    ) {
      res.status(403).json({
        success: false,
        message: "You can only rate your own appointments",
      });
      return;
    }

    // check if appointment already have ratingId if yes do not create new overwrite the old
    if (appointment.ratingId) {
      await RatingModel.findByIdAndUpdate(
        appointment.ratingId,
        { rating, review },
        { new: true }
      );
      res.status(200).json({
        success: true,
        message: "Rating updated successfully",
      });
      return;
    }

    // if appointment already don't have ratingId, create new rating.
    const newRating = await RatingModel.create({
      appointmentId,
      appointmentTypeRef,
      doctorId: doctor._id,
      patientId: patient._id,
      rating,
      review,
    });
    // update the appointment model with ratingId.
    appointment.ratingId = newRating._id;
    await appointment.save();

    res.status(201).json({
      success: true,
      message: "Rating added successfully",
      data: newRating,
    });
  } catch (error) {
    console.error("Error in adding the rating:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add rating",
    });
  }
};

// doctor can change isEnable status of a rating
export const toggleRatingVisibility = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorUserId = req.user.id;
    const { ratingId } = req.params;
    const { isEnable } = req.body;

    // Find doctor by userId
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find the rating by id
    const rating = await RatingModel.findById(ratingId);
    if (!rating) {
      res.status(404).json({
        success: false,
        message: "Rating not found",
      });
      return;
    }

    // Ensure rating belongs to this doctor
    if (!rating.doctorId.equals(doctor._id)) {
      res.status(403).json({
        success: false,
        message: "Unauthorized to modify this rating",
      });
      return;
    }

    // Update visibility (toggle or set)
    if (typeof isEnable === "boolean") {
      rating.isEnable = isEnable;
    } else {
      rating.isEnable = !rating.isEnable; // toggle if not explicitly sent
    }

    await rating.save();

    res.status(200).json({
      success: true,
      message: "Rating visibility updated successfully",
      data: { ratingId: rating._id, isEnable: rating.isEnable },
    });
  } catch (error) {
    console.error("Error toggling rating visibility:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update rating visibility",
    });
  }
};

// get a single rating by ratingId
export const getRatingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { ratingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ratingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid Rating ID format",
      });
      return;
    }

    // Find rating and populate related data
    const rating = await RatingModel.findById(ratingId);
    if (!rating) {
      res.status(404).json({
        success: false,
        message: "Rating not found",
      });
      return;
    }
    console.log("Rating ", rating);

    res.status(200).json({
      success: true,
      message: "Rating fetched successfully",
      data: rating,
    });
  } catch (error) {
    console.error("Error fetching rating by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rating",
    });
  }
};
