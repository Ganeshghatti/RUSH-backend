import { Request, Response } from "express";
import DoctorSubscription from "../../models/doctor-subscription";
import Doctor from "../../models/user/doctor-model";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import QRCode from "qrcode";
import { generateSignedUrlsForSubscriptions } from "../../utils/signed-url";

// Validate online fee object (min15, min30, min60)
function validateOnlineFee(fee: any, label: string): string | null {
  const slots = ["min15", "min30", "min60"];
  for (const slot of slots) {
    if (
      !fee ||
      typeof fee[slot] !== "object" ||
      !["Number", "Percentage"].includes(fee[slot]?.type) ||
      typeof fee[slot]?.figure !== "number" ||
      fee[slot].figure < 0
    ) {
      return `${label}.${slot} must be an object with type ('Number' or 'Percentage') and a non-negative figure`;
    }
  }
  return null;
}

export const createSubscription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      price,
      name,
      description,
      features,
      isActive,
      duration,
      platformFeeOnline,
      opsExpenseOnline,
      platformFeeClinic,
      opsExpenseClinic,
      platformFeeEmergency,
      opsExpenseEmergency,
      platformFeeHomeVisit,
      opsExpenseHomeVisit,
      doctor_type,
      doctor_type_description,
      no_of_clinics,
      advertisement_cost
    } = req.body;

    if (price < 0) {
      res.status(400).json({
        success: false,
        message: "Price must be zero or higher.",
        action: "createDoctorSubscription:invalid-price",
      });
      return;
    }

    // Validate platformFeeOnline and opsExpenseOnline (min15, min30, min60)
    const pfOnlineErr = validateOnlineFee(
      platformFeeOnline,
      "platformFeeOnline"
    );
    const oeOnlineErr = validateOnlineFee(opsExpenseOnline, "opsExpenseOnline");
    if (pfOnlineErr || oeOnlineErr) {
      res.status(400).json({
        success: false,
        message: "Please review the online fee settings.",
        action: `createDoctorSubscription:${pfOnlineErr ? "platform-fee-error" : "ops-fee-error"}`,
        data: {
          details: pfOnlineErr || oeOnlineErr,
        },
      });
      return;
    }

    // Validate other fee objects (clinic, homevisit, emergency)
    const feeFields = [
      platformFeeClinic,
      opsExpenseClinic,
      platformFeeHomeVisit,
      opsExpenseHomeVisit,
      platformFeeEmergency,
      opsExpenseEmergency,
    ];
    for (const fee of feeFields) {
      if (
        !fee ||
        typeof fee !== "object" ||
        !["Number", "Percentage"].includes(fee.type) ||
        typeof fee.figure !== "number" ||
        fee.figure < 0
      ) {
        res.status(400).json({
          success: false,
          message:
            "Please review the clinic, home visit, and emergency fee settings.",
          action: `createDoctorSubscription:invalid-fee-${feeFields.indexOf(fee)}`,
        });
        return;
      }
    }

    // Validate required fields
    if (!name || !description || !duration) {
      res.status(400).json({
        success: false,
        message:
          "Price, name, description, and duration are required to create a subscription.",
        action: "createDoctorSubscription:missing-required-fields",
      });
      return;
    }

    const upiLink = `upi://pay?pa=yespay.bizsbiz81637@yesbankltd&pn=RUSHDR&am=${parseFloat(
      price
    ).toFixed(2)}&cu=INR`;

    const qrCodeDataUrl = await QRCode.toDataURL(upiLink);

    // Convert Data URL to Buffer
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(base64Data, "base64");

    // Upload QR code to S3
    const timestamp = Date.now();
    const s3Key = `qr-codes/subscription-${timestamp}.png`;

    const signedUrl = await UploadImgToS3({
      key: s3Key,
      fileBuffer: qrBuffer,
      fileName: `subscription-${timestamp}.png`,
    });

    const subscription = await DoctorSubscription.create({
      price: parseFloat(price).toFixed(2),
      name,
      description,
      features: features || [],
      isActive: isActive,
      duration,
      // qrCodeImage: signedUrl,
      doctor_type,
      doctor_type_description,
      no_of_clinics: typeof no_of_clinics === "number" ? no_of_clinics : 0,
      advertisement_cost: typeof advertisement_cost === "number" ? advertisement_cost : 0,
      platformFeeOnline,
      opsExpenseOnline,
      platformFeeClinic,
      opsExpenseClinic,
      platformFeeHomeVisit,
      opsExpenseHomeVisit,
      platformFeeEmergency,
      opsExpenseEmergency,
    });

    res.status(201).json({
      success: true,
      message: "Subscription created successfully.",
      action: "createDoctorSubscription:success",
      data: subscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't create the subscription.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateSubscription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      isActive,
      name,
      description,
      features,
      price,
      platformFeeOnline,
      opsExpenseOnline,
      platformFeeClinic,
      opsExpenseClinic,
      platformFeeHomeVisit,
      opsExpenseHomeVisit,
      platformFeeEmergency,
      opsExpenseEmergency,
      no_of_clinics,
      advertisement_cost,
    } = req.body;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    // Validate and add no_of_clinics if provided
    if (no_of_clinics !== undefined) {
      if (typeof no_of_clinics !== "number" || no_of_clinics < 0) {
        res.status(400).json({
          success: false,
          message: "Number of clinics must be zero or higher.",
          action: "updateDoctorSubscription:invalid-clinic-count",
        });
        return;
      }
      updateData.no_of_clinics = no_of_clinics;
    }

    // Validate and add advertisement_cost if provided
    if (advertisement_cost !== undefined) {
      if (typeof advertisement_cost !== "number" || advertisement_cost < 0) {
        res.status(400).json({
          success: false,
          message: "Advertisement cost must be zero or higher.",
          action: "updateDoctorSubscription:invalid-advertisement-cost",
        });
        return;
      }
      updateData.advertisement_cost = advertisement_cost;
    }

    // Validate and add isActive if provided
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
          action: "updateDoctorSubscription:invalid-isActive",
        });
        return;
      }
      updateData.isActive = isActive;
    }

    // Validate and add name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Name must be a non-empty string.",
          action: "updateDoctorSubscription:invalid-name",
        });
        return;
      }
      updateData.name = name.trim();
    }

    // Validate and add description if provided
    if (description !== undefined) {
      if (typeof description !== "string" || description.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Description must be a non-empty string.",
          action: "updateDoctorSubscription:invalid-description",
        });
        return;
      }
      updateData.description = description.trim();
    }

    // Validate and add features if provided
    if (features !== undefined) {
      if (!Array.isArray(features)) {
        res.status(400).json({
          success: false,
          message: "Features must be provided as a list.",
          action: "updateDoctorSubscription:invalid-features-type",
        });
        return;
      }

      // Validate each feature is a string
      for (const feature of features) {
        if (typeof feature !== "string" || feature.trim() === "") {
          res.status(400).json({
            success: false,
            message: "Each feature must be a non-empty string.",
            action: "updateDoctorSubscription:invalid-feature-entry",
          });
          return;
        }
      }

      updateData.features = features.map((feature: string) => feature.trim());
    }

    // Validate and add fee fields if provided
    const feeUpdateFields = [
      "platformFeeOnline",
      "opsExpenseOnline",
      "platformFeeClinic",
      "opsExpenseClinic",
      "platformFeeHomeVisit",
      "opsExpenseHomeVisit",
      "platformFeeEmergency",
      "opsExpenseEmergency",
    ];
    for (const field of feeUpdateFields) {
      if (req.body[field] !== undefined) {
        if (field === "platformFeeOnline" || field === "opsExpenseOnline") {
          const err = validateOnlineFee(req.body[field], field);
          if (err) {
            res.status(400).json({
              success: false,
              message: "Please review the online fee settings.",
              action: `updateDoctorSubscription:${field}-error`,
              data: {
                details: err,
              },
            });
            return;
          }
          updateData[field] = req.body[field];
        } else {
          const fee = req.body[field];
          if (
            !fee ||
            typeof fee !== "object" ||
            !["Number", "Percentage"].includes(fee.type) ||
            typeof fee.figure !== "number" ||
            fee.figure < 0
          ) {
            res.status(400).json({
              success: false,
              message: "Please review the fee settings for clinic, home visit, or emergency.",
              action: `updateDoctorSubscription:invalid-fee-${field}`,
            });
            return;
          }
          updateData[field] = fee;
        }
      }
    }

    // validate and add price if provided
    if (price !== undefined) {
      if (typeof price !== "number") {
        res.status(400).json({
          success: false,
          message: "Price must be a number.",
          action: "updateDoctorSubscription:invalid-price",
        });
        return;
      }
      updateData.price = price;
    }

    // Check if at least one field is provided for update
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message:
          "Provide at least one field to update the subscription.",
        action: "updateDoctorSubscription:no-fields",
      });
      return;
    }

    const subscription = await DoctorSubscription.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!subscription) {
      res.status(404).json({
        success: false,
        message: "We couldn't find that subscription.",
        action: "updateDoctorSubscription:not-found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully.",
      action: "updateDoctorSubscription:success",
      data: subscription,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the subscription.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getSubscriptions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const subscriptions = await DoctorSubscription.find({});

    res.status(200).json({
      success: true,
      message: "Subscriptions fetched successfully.",
      action: "getDoctorSubscriptions:success",
      data: subscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the subscriptions.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getActiveSubscriptions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const activeSubscriptions = await DoctorSubscription.find({
      isActive: true,
    });

    if (!activeSubscriptions || activeSubscriptions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No active subscriptions are available right now.",
        action: "getActiveDoctorSubscriptions:none-found",
      });
      return;
    }

    // Generate signed URLs for all active subscriptions
    const subscriptionsWithSignedUrls =
      await generateSignedUrlsForSubscriptions(activeSubscriptions);

    res.status(200).json({
      success: true,
      message: "Active subscriptions fetched successfully.",
      action: "getActiveDoctorSubscriptions:success",
      data: subscriptionsWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching active subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the active subscriptions.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deleteSubscription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const subscription = await DoctorSubscription.findById(id);
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: "We couldn't find that subscription.",
        action: "deleteDoctorSubscription:not-found",
      });
      return;
    }

    const doctorsUsingSubscription = await Doctor.find({
      "subscriptions.SubscriptionId": id,
    });

    if (doctorsUsingSubscription.length > 0) {
      res.status(400).json({
        success: false,
        message:
          "This subscription is assigned to one or more doctors and cannot be deleted.",
        action: "deleteDoctorSubscription:in-use",
        data: {
          doctorCount: doctorsUsingSubscription.length,
        },
      });
      return;
    }

    await DoctorSubscription.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully.",
      action: "deleteDoctorSubscription:success",
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't delete the subscription.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
