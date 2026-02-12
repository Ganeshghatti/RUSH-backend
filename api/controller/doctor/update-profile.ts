import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import { generateSignedUrlsForUser } from "../../utils/signed-url";

export const updateDoctorOnlineAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { availability, duration, isActive } = req.body;

    // Validate doctorId
    if (!doctorId) {
      res.status(400).json({
        success: false,
        message: "Doctor ID is required.",
        action: "updateDoctorOnlineAppointment:missing-doctor-id",
      });
      return;
    }

    const updateFields: any = {};

    // Handle availability update if provided
    if (availability) {
      // Validate availability data
      if (!Array.isArray(availability)) {
        res.status(400).json({
          success: false,
          message: "Availability must be provided as a list.",
          action: "updateDoctorOnlineAppointment:invalid-availability-type",
        });
        return;
      }

      // Validate each availability entry
      for (const slot of availability) {
        if (!slot.day || !Array.isArray(slot.duration)) {
          res.status(400).json({
            success: false,
            message: "Each availability slot must include a day and time ranges.",
            action: "updateDoctorOnlineAppointment:invalid-slot",
          });
          return;
        }

        // Validate day value
        const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        if (!validDays.includes(slot.day.toLowerCase())) {
          res.status(400).json({
            success: false,
            message: "Please use a valid day of the week.",
            action: "updateDoctorOnlineAppointment:invalid-day",
            data: {
              allowedDays: validDays,
            },
          });
          return;
        }

        // Validate duration entries
        for (const duration of slot.duration) {
          if (!duration.start || !duration.end) {
            res.status(400).json({
              success: false,
              message: "Each time range must include start and end times.",
              action: "updateDoctorOnlineAppointment:invalid-duration-range",
            });
            return;
          }
        }
      }

      updateFields["onlineAppointment.availability"] = availability;
    }

    // Handle duration update if provided
    if (duration) {
      // Validate duration data
      if (!Array.isArray(duration)) {
        res.status(400).json({
          success: false,
          message: "Duration must be provided as a list.",
          action: "updateDoctorOnlineAppointment:invalid-duration-type",
        });
        return;
      }

      // Validate each duration entry
      for (const slot of duration) {
        if (!slot.minute || !slot.price) {
          res.status(400).json({
            success: false,
            message: "Each duration slot must include minutes and price.",
            action: "updateDoctorOnlineAppointment:missing-duration-fields",
          });
          return;
        }

        // Validate minute value
        if (![15, 30].includes(slot.minute)) {
          res.status(400).json({
            success: false,
            message: "Duration minutes must be either 15 or 30.",
            action: "updateDoctorOnlineAppointment:invalid-minute",
          });
          return;
        }

        // Validate price value
        if (typeof slot.price !== 'number' || slot.price <= 0) {
          res.status(400).json({
            success: false,
            message: "Price must be a positive number.",
            action: "updateDoctorOnlineAppointment:invalid-price",
          });
          return;
        }
      }

      updateFields["onlineAppointment.duration"] = duration;
    }

    // Handle isActive update if provided
    if (typeof isActive === 'boolean') {
      updateFields["onlineAppointment.isActive"] = isActive;
    }

    // If neither availability, duration, nor isActive is provided
    if (Object.keys(updateFields).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide availability, duration, or active status to update.",
        action: "updateDoctorOnlineAppointment:no-fields",
      });
      return;
    }

    // Update the doctor's online appointment settings
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        $set: {
          ...updateFields,
          "onlineAppointment.updatedAt": new Date()
        },
      },
      { new: true, select: '-password' }
    ).populate("userId");

    if (!updatedDoctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the doctor profile.",
        action: "updateDoctorOnlineAppointment:doctor-not-found",
      });
      return;
    }

    const doctorWithSignedUrls = await generateSignedUrlsForUser(updatedDoctor);

    res.status(200).json({
      success: true,
      message: "Online appointment settings updated successfully.",
      action: "updateDoctorOnlineAppointment:success",
      data: doctorWithSignedUrls,
    });
  } catch (error: any) {
    console.error("Error updating online appointment settings:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the online appointment settings.",
      action: error.message,
    });
  }
};

export const updateProfessionalDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const { qualifications, registrations, experiences, signatureImage } = req.body;

    // Find the doctor record using userId
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find a doctor profile for this user.",
        action: "updateProfessionalDetails:doctor-not-found",
      });
      return;
    }

    const updateFields: any = {};

    // Update qualifications if provided
    if (qualifications && Array.isArray(qualifications)) {
      // Validate each qualification
      for (const qual of qualifications) {
        if (qual.year && (qual.year < 1900 || qual.year > new Date().getFullYear())) {
          res.status(400).json({
            success: false,
            message: "Invalid year in qualifications.",
            action: "updateProfessionalDetails:invalid-year",
          });
          return;
        }
      }
      updateFields.qualifications = qualifications;
    }

    // Update registrations if provided
    if (registrations && Array.isArray(registrations)) {
      updateFields.registration = registrations;
    }

    // Update experiences if provided
    if (experiences && Array.isArray(experiences)) {
      // Validate experience years
      for (const exp of experiences) {
        if (exp.fromYear && (exp.fromYear < 1900 || exp.fromYear > new Date().getFullYear())) {
          res.status(400).json({
            success: false,
            message: "Invalid fromYear in experience.",
            action: "updateProfessionalDetails:invalid-from-year",
          });
          return;
        }
        if (exp.toYear && (exp.toYear < 1900 || exp.toYear > new Date().getFullYear())) {
          res.status(400).json({
            success: false,
            message: "Invalid toYear in experience.",
            action: "updateProfessionalDetails:invalid-to-year",
          });
          return;
        }
      }
      updateFields.experience = experiences;
    }

    // Update signature image if provided
    if (signatureImage !== undefined) {
      updateFields.signatureImage = signatureImage;
    }

    if (Object.keys(updateFields).length === 0) {
      res.status(400).json({
        success: false,
        message: "No professional details provided to update.",
        action: "updateProfessionalDetails:no-fields",
      });
      return;
    }

    // Update the doctor document
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctor._id,
      { $set: updateFields },
      { new: true, runValidators: true, select: '-password' }
    ).populate("userId");

    if (!updatedDoctor) {
      res.status(500).json({
        success: false,
        message: "We couldn't update the professional details.",
        action: "updateProfessionalDetails:update-failed",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Professional details updated successfully.",
      action: "updateProfessionalDetails:success",
      data: updatedDoctor,
    });

  } catch (error: any) {
    console.error("Error updating professional details:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the professional details.",
      action: error.message,
    });
  }
};