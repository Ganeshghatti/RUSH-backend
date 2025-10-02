import { Request, Response } from "express";
import DoctorSubscription from "../../models/doctor-subscription";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import QRCode from "qrcode";
import Doctor from "../../models/user/doctor-model";
import { DeleteMediaFromS3 } from "../../utils/aws_s3/delete-media";
import {
  generateSignedUrlsForSubscriptions,
  generateSignedUrlsForSubscription,
} from "../../utils/signed-url";

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
    } = req.body;

    if (price < 0) {
      res.status(400).json({
        success: false,
        message: "Price must be a non-negative number (0 or greater)",
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
        message: pfOnlineErr || oeOnlineErr,
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
            "All platform/ops fees (except online) must be objects with type ('Number' or 'Percentage') and a non-negative figure",
        });
        return;
      }
    }

    // Validate required fields
    if (!name || !description || !duration) {
      res.status(400).json({
        success: false,
        message:
          "Missing required subscription fields: price, name, description, and duration are required",
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
      message: "Subscription created successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create subscription",
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
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};

    // Validate and add isActive if provided
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        res.status(400).json({
          success: false,
          message: "isActive field must be a boolean",
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
          message: "name field must be a non-empty string",
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
          message: "description field must be a non-empty string",
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
          message: "features field must be an array",
        });
        return;
      }

      // Validate each feature is a string
      for (const feature of features) {
        if (typeof feature !== "string" || feature.trim() === "") {
          res.status(400).json({
            success: false,
            message: "All features must be non-empty strings",
          });
          return;
        }
      }

      updateData.features = features.map((feature: string) => feature.trim());
    }

    //add fee
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
              message: err,
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
              message: `Field ${field} must be an object with type ('Number' or 'Percentage') and a non-negative figure`,
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
          message: "Price field must be a number",
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
          "At least one field (isActive, name, description, or features) must be provided for update",
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
        message: "Subscription not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: subscription,
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
    });
  }
};

export const getSubscriptions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const subscriptions = await DoctorSubscription.find({});

    const subscriptionsWithSignedUrls =
      await generateSignedUrlsForSubscriptions(subscriptions);

    res.status(200).json({
      success: true,
      message: "Subscriptions fetched successfully",
      data: subscriptionsWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
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
        message: "No active subscriptions found",
      });
      return;
    }

    // Generate signed URLs for all active subscriptions
    const subscriptionsWithSignedUrls =
      await generateSignedUrlsForSubscriptions(activeSubscriptions);

    res.status(200).json({
      success: true,
      message: "Active subscriptions fetched successfully",
      data: subscriptionsWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching active subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active subscriptions",
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
        message: "Subscription not found",
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
          "Cannot delete this subscription as it is currently used by one or more doctors",
        doctorCount: doctorsUsingSubscription.length,
      });
      return;
    }

    // Extract QR code image URL to delete from S3
    // const qrCodeUrl = subscription.qrCodeImage;
    
    // Delete the subscription from database
    await DoctorSubscription.findByIdAndDelete(id);

    // Extract the key from the URL for S3 deletion
    
    // if (qrCodeUrl) {
    //   try {
    //     const urlParts = qrCodeUrl.split('/');
    //     const key = urlParts.slice(3).join('/');
        
    //     if (key) {
    //       await DeleteMediaFromS3({ key });
    //     }
    //   } catch (error) {
    //     console.error("Error deleting QR code image from S3:", error);
    //   }
    // }

    res.status(200).json({
      success: true,
      message: "Subscription deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete subscription",
    });
  }
};
