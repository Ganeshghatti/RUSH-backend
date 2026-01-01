import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import { generateSignedUrlsForUser } from "../../utils/signed-url";
import { getKeyFromSignedUrl } from "../../utils/aws_s3/upload-media";
import { updateProfileSchema } from "../../validation/validation";

export const updateDoctorOnlineAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
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
            message:
              "Each availability slot must include a day and time ranges.",
            action: "updateDoctorOnlineAppointment:invalid-slot",
          });
          return;
        }

        // Validate day value
        const validDays = [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ];
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
        if (typeof slot.price !== "number" || slot.price <= 0) {
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
    if (typeof isActive === "boolean") {
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
          "onlineAppointment.updatedAt": new Date(),
        },
      },
      { new: true, select: "-password" }
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

export const updateDoctorProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    console.log("Req.boyd ",req.body)

    // Validate request body using Zod
    const validationResult = updateProfileSchema.safeParse(req.body);
    console.log("VALL result ", validationResult);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Please review the profile details and try again.",
        action: "updateDoctorProfile:validation-error",
        data: {
          errors: validationResult.error.errors,
        },
      });
      return;
    }

    const { user, doctor } = validationResult.data;

    console.log("user to update", user);
    console.log("doctor to update", doctor);

    // Find the doctor record using userId
    const existingDoctor = await Doctor.findOne({ userId }).populate("userId");
    if (!existingDoctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find a doctor profile for this user.",
        action: "updateDoctorProfile:doctor-not-found",
      });
      return;
    }

    const updatePromises = [];

    // Helper function to process image fields and convert URLs to keys
    // Fixed to exclude date fields and other non-image fields
    const processImageFields = async (
      data: any,
      parentKey?: string
    ): Promise<any> => {
      if (!data || typeof data !== "object") return data;

      const processedData = { ...data };

      // List of fields that should NOT be processed for image URLs
      const excludeFields = [
        "dob",
        "year",
        "fromYear",
        "toYear",
        "minute",
        "price",
      ];

      for (const [key, value] of Object.entries(processedData)) {
        // Skip processing for excluded fields
        if (excludeFields.includes(key)) {
          continue;
        }

        if (typeof value === "string" && value.includes("https://")) {
          // This is likely a presigned URL, convert to key
          const extractedKey = await getKeyFromSignedUrl(value);
          if (extractedKey) {
            processedData[key] = extractedKey;
          }
        } else if (Array.isArray(value)) {
          // Process arrays recursively
          processedData[key] = await Promise.all(
            value.map(async (item) => await processImageFields(item, key))
          );
        } else if (typeof value === "object" && value !== null) {
          // Process nested objects recursively
          processedData[key] = await processImageFields(value, key);
        }
      }

      return processedData;
    };

    // Update User model if user data is provided
    if (user && Object.keys(user).length > 0) {
      const userUpdateData: any = { ...user };

      // Convert dob string to Date if provided (do this BEFORE processing image fields)
      if (user?.dob && typeof user?.dob === "string") {
        userUpdateData.dob = new Date(user.dob);
      }

      // Process image fields in user data (dob is now a Date object, so won't be processed)
      const processedUserData = await processImageFields(userUpdateData);
      console.log("processed user data", processedUserData);

      updatePromises.push(
        User.findByIdAndUpdate(
          userId,
          { $set: processedUserData },
          { new: true, runValidators: true, select: "-password" }
        )
      );
    }

    // Update Doctor model if doctor data is provided
    if (doctor && Object.keys(doctor).length > 0) {
      // Process image fields in doctor data
      const processedDoctorData = await processImageFields(doctor);

      console.log("processed doctor data", processedDoctorData);

      updatePromises.push(
        Doctor.findByIdAndUpdate(
          existingDoctor._id,
          { $set: processedDoctorData },
          { new: true, runValidators: true, select: "-password" }
        )
      );
    }

    // Execute all update promises
    const updateResults = await Promise.all(updatePromises);

    if (!updateResults) {
      res.status(500).json({
        success: false,
        message: "We couldn't update the doctor information.",
        action: "updateDoctorProfile:update-failed",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Doctor profile updated successfully.",
      action: "updateDoctorProfile:success",
      data: {},
    });
  } catch (error: any) {
    console.error("Error updating doctor profile:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the doctor profile.",
      action: error.message,
    });
  }
};
