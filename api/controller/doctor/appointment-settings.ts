import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import DoctorSubscription from "../../models/doctor-subscription";
import { generateSignedUrlsForUser } from "../../utils/signed-url";
import {
  clinicPatchRequestSchema,
  homeVisitConfigUpdateSchema,
} from "../../validation/validation";

const VALID_TYPES = ["online", "clinic", "homeVisit"] as const;
const VALID_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/**
 * Unified handler for updating any of the 3 appointment-type settings.
 * Body: { type: "online" | "clinic" | "homeVisit", ...payload }
 */
export const updateAppointmentSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type, ...payload } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      res.status(400).json({
        success: false,
        message:
          "Invalid or missing type. Use one of: online, clinic, homeVisit.",
        action: "updateAppointmentSettings:invalid-type",
      });
      return;
    }

    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "You must be signed in to update appointment settings.",
        action: "updateAppointmentSettings:not-authenticated",
      });
      return;
    }

    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "updateAppointmentSettings:doctor-not-found",
      });
      return;
    }

    // --- ONLINE ---
    if (type === "online") {
      const { availability, duration, isActive } = payload;
      const updateFields: any = {};

      if (availability !== undefined) {
        if (!Array.isArray(availability)) {
          res.status(400).json({
            success: false,
            message: "Availability must be provided as a list.",
            action: "updateAppointmentSettings:invalid-availability-type",
          });
          return;
        }
        for (const slot of availability) {
          if (!slot.day || !Array.isArray(slot.duration)) {
            res.status(400).json({
              success: false,
              message:
                "Each availability slot must include a day and time ranges.",
              action: "updateAppointmentSettings:invalid-slot",
            });
            return;
          }
          if (!VALID_DAYS.includes(slot.day.toLowerCase())) {
            res.status(400).json({
              success: false,
              message: "Please use a valid day of the week.",
              action: "updateAppointmentSettings:invalid-day",
              data: { allowedDays: VALID_DAYS },
            });
            return;
          }
          for (const d of slot.duration) {
            if (!d.start || !d.end) {
              res.status(400).json({
                success: false,
                message: "Each time range must include start and end times.",
                action: "updateAppointmentSettings:invalid-duration-range",
              });
              return;
            }
          }
        }
        updateFields["onlineAppointment.availability"] = availability;
      }

      if (duration !== undefined) {
        if (!Array.isArray(duration)) {
          res.status(400).json({
            success: false,
            message: "Duration must be provided as a list.",
            action: "updateAppointmentSettings:invalid-duration-type",
          });
          return;
        }
        for (const slot of duration) {
          if (slot.minute == null || slot.price == null) {
            res.status(400).json({
              success: false,
              message:
                "Each duration slot must include minutes and price.",
              action: "updateAppointmentSettings:missing-duration-fields",
            });
            return;
            }
          if (![15, 30].includes(slot.minute)) {
            res.status(400).json({
              success: false,
              message: "Duration minutes must be either 15 or 30.",
              action: "updateAppointmentSettings:invalid-minute",
            });
            return;
          }
          if (typeof slot.price !== "number" || slot.price <= 0) {
            res.status(400).json({
              success: false,
              message: "Price must be a positive number.",
              action: "updateAppointmentSettings:invalid-price",
            });
            return;
          }
        }
        updateFields["onlineAppointment.duration"] = duration;
      }

      if (typeof isActive === "boolean") {
        updateFields["onlineAppointment.isActive"] = isActive;
      }

      if (Object.keys(updateFields).length === 0) {
        res.status(400).json({
          success: false,
          message:
            "Provide availability, duration, or active status to update.",
          action: "updateAppointmentSettings:no-fields",
        });
        return;
      }

      const updatedDoctor = await Doctor.findByIdAndUpdate(
        doctor._id,
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
          action: "updateAppointmentSettings:doctor-not-found",
        });
        return;
      }

      const doctorWithSignedUrls = await generateSignedUrlsForUser(
        updatedDoctor
      );
      res.status(200).json({
        success: true,
        message: "Online appointment settings updated successfully.",
        action: "updateAppointmentSettings:online-success",
        data: doctorWithSignedUrls,
      });
      return;
    }

    // --- CLINIC ---
    if (type === "clinic") {
      const validation = clinicPatchRequestSchema.safeParse(payload);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: "Please review the clinic details and try again.",
          action: "updateAppointmentSettings:validation-error",
          data: { errors: validation.error.errors },
        });
        return;
      }

      const validatedData = validation.data;
      if (Object.keys(validatedData).length === 0) {
        res.status(400).json({
          success: false,
          message: "Please provide fields to update.",
          action: "updateAppointmentSettings:no-fields",
        });
        return;
      }

      const updateQuery: { [key: string]: any } = {};

      if (validatedData.clinics !== undefined) {
        const doc = await Doctor.findOne({ userId }).select("subscriptions");
        if (!doc) {
          res.status(404).json({
            success: false,
            message: "We couldn't find your doctor profile.",
            action: "updateAppointmentSettings:doctor-not-found",
          });
          return;
        }
        const activeSub =
          doc.subscriptions && doc.subscriptions.length > 0
            ? doc.subscriptions[doc.subscriptions.length - 1]
            : null;
        if (!activeSub || !activeSub.SubscriptionId) {
          res.status(400).json({
            success: false,
            message: "No active subscription found. Please subscribe to a plan.",
            action: "updateAppointmentSettings:no-active-subscription",
          });
          return;
        }
        const subDoc = await DoctorSubscription.findById(
          activeSub.SubscriptionId
        );
        if (!subDoc) {
          res.status(400).json({
            success: false,
            message: "We couldn't find the associated subscription plan.",
            action: "updateAppointmentSettings:subscription-not-found",
          });
          return;
        }
        const maxClinics = subDoc.no_of_clinics || 0;
        if (
          Array.isArray(validatedData.clinics) &&
          validatedData.clinics.length > maxClinics
        ) {
          res.status(400).json({
            success: false,
            message: `Your subscription allows only ${maxClinics} clinics. Upgrade your plan to add more clinics.`,
            action: "updateAppointmentSettings:clinic-limit",
          });
          return;
        }
        updateQuery["clinicVisit.clinics"] = validatedData.clinics;
      }
      if (validatedData.isActive !== undefined) {
        updateQuery["clinicVisit.isActive"] = validatedData.isActive;
      }

      const updatedDoctor = await Doctor.findOneAndUpdate(
        { userId },
        { $set: updateQuery },
        { new: true, select: "clinicVisit" }
      );

      if (!updatedDoctor) {
        res.status(404).json({
          success: false,
          message: "We couldn't find your doctor profile.",
          action: "updateAppointmentSettings:doctor-not-found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Clinic details updated successfully.",
        action: "updateAppointmentSettings:clinic-success",
        data: updatedDoctor.clinicVisit,
      });
      return;
    }

    // --- HOME VISIT ---
    if (type === "homeVisit") {
      const parsed = homeVisitConfigUpdateSchema.safeParse(payload);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: "Please review the configuration details and try again.",
          action: "updateAppointmentSettings:validation-error",
          data: { errors: parsed.error.errors },
        });
        return;
      }

      const { isActive, fixedPrice, availability } = parsed.data;

      if (isActive !== undefined && doctor.homeVisit) {
        doctor.homeVisit.isActive = isActive;
      }
      if (fixedPrice !== undefined && doctor.homeVisit) {
        doctor.homeVisit.fixedPrice = fixedPrice;
      }
      if (availability && doctor.homeVisit) {
        (doctor.homeVisit as any).availability = availability;
      }
      if (doctor.homeVisit) {
        doctor.homeVisit.updatedAt = new Date();
      }

      await doctor.save();

      res.status(200).json({
        success: true,
        message: "Home visit configuration updated successfully.",
        action: "updateAppointmentSettings:homeVisit-success",
        data: doctor.homeVisit,
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: "Invalid type.",
      action: "updateAppointmentSettings:invalid-type",
    });
  } catch (err: any) {
    console.error("Error in updateAppointmentSettings:", err);
    res.status(500).json({
      success: false,
      message: "We couldn't update the appointment settings.",
      action: err?.message ?? String(err),
    });
  }
};
