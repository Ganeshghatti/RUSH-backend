import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import { generateSignedUrlsForUser } from "../../utils/signed-url";
import { getKeyFromSignedUrl } from "../../utils/aws_s3/upload-media";
import { updateProfileSchema } from "../../validation/validation";

export const updateDoctorOnlineAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { availability, duration, isActive } = req.body;

    // Validate doctorId
    if (!doctorId) {
      res.status(400).json({
        success: false,
        message: "Doctor ID is required",
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
          message: "Valid availability array is required",
        });
        return;
      }

      // Validate each availability entry
      for (const slot of availability) {
        if (!slot.day || !Array.isArray(slot.duration)) {
          res.status(400).json({
            success: false,
            message: "Each availability slot must have a day and duration array",
          });
          return;
        }

        // Validate day value
        const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        if (!validDays.includes(slot.day.toLowerCase())) {
          res.status(400).json({
            success: false,
            message: `Invalid day value. Must be one of: ${validDays.join(", ")}`,
          });
          return;
        }

        // Validate duration entries
        for (const duration of slot.duration) {
          if (!duration.start || !duration.end) {
            res.status(400).json({
              success: false,
              message: "Each duration must have start and end times",
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
          message: "Valid duration array is required",
        });
        return;
      }

      // Validate each duration entry
      for (const slot of duration) {
        if (!slot.minute || !slot.price) {
          res.status(400).json({
            success: false,
            message: "Each duration slot must have minute and price",
          });
          return;
        }

        // Validate minute value
        if (![15, 30].includes(slot.minute)) {
          res.status(400).json({
            success: false,
            message: "Duration minute must be either 15 or 30",
          });
          return;
        }

        // Validate price value
        if (typeof slot.price !== 'number' || slot.price <= 0) {
          res.status(400).json({
            success: false,
            message: "Price must be a positive number",
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
        message: "Either availability, duration, or isActive must be provided",
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
        message: "Doctor not found",
      });
      return;
    }

    const doctorWithSignedUrls = await generateSignedUrlsForUser(updatedDoctor);

    res.status(200).json({
      success: true,
      data: doctorWithSignedUrls,
      message: "Online appointment settings updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating online appointment settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating online appointment settings",
      error: error.message,
    });
  }
};

export const updateDoctorProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Validate request body using Zod
    const validationResult = updateProfileSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    const { user, doctor } = validationResult.data;

    // Find the doctor record using userId
    const existingDoctor = await Doctor.findOne({ userId }).populate("userId");
    if (!existingDoctor) {
      res.status(404).json({
        success: false,
        message: "Doctor profile not found for this user",
      });
      return;
    }

    const updatePromises = [];

    // Helper function to process image fields and convert URLs to keys
    const processImageFields = async (data: any): Promise<any> => {
      if (!data || typeof data !== 'object') return data;
      
      const processedData = { ...data };
      
      for (const [key, value] of Object.entries(processedData)) {
        if (typeof value === 'string' && value.includes('https://')) {
          // This is likely a presigned URL, convert to key
          const extractedKey = await getKeyFromSignedUrl(value);
          if (extractedKey) {
            processedData[key] = extractedKey;
          }
        } else if (Array.isArray(value)) {
          // Process arrays recursively
          processedData[key] = await Promise.all(
            value.map(async (item) => await processImageFields(item))
          );
        } else if (typeof value === 'object' && value !== null) {
          // Process nested objects recursively
          processedData[key] = await processImageFields(value);
        }
      }
      
      return processedData;
    };


    // Update User model if user data is provided
    if (user && Object.keys(user).length > 0) {
      const userUpdateData: any = { ...user };
      
      // Convert dob string to Date if provided
      if (user.dob) {
        userUpdateData.dob = new Date(user.dob);
      }

      // Process image fields in user data
      const processedUserData = await processImageFields(userUpdateData);
      console.log("key only urls", processedUserData)

      updatePromises.push(
        User.findByIdAndUpdate(
          userId,
          { $set: processedUserData },
          { new: true, runValidators: true, select: '-password' }
        )
      );
    }

    // Update Doctor model if doctor data is provided
    if (doctor && Object.keys(doctor).length > 0) {
      // Process image fields in doctor data
      const processedDoctorData = await processImageFields(doctor);

      console.log("key only urls", processedDoctorData)

      updatePromises.push(
        Doctor.findByIdAndUpdate(
          existingDoctor._id,
          { $set: processedDoctorData },
          { new: true, runValidators: true, select: '-password' }
        )
      );
    }

    // Execute all update promises
    const updateResults = await Promise.all(updatePromises);

    if (!updateResults) {
      res.status(500).json({
        success: false,
        message: "Failed to update doctor information",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {},
      message: "Doctor profile updated successfully",
    });

  } catch (error: any) {
    console.error("Error updating doctor profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating doctor profile",
      error: error.message,
    });
  }
};