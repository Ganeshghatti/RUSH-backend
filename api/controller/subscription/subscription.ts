import { Request, Response } from "express";
import DoctorSubscription from "../../models/subscription-model";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import QRCode from "qrcode";

export const createSubscription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { price, name, description, features, isActive, duration } = req.body;

    // Validate required fields
    if (!price || !name || !description || !duration) {
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
      qrCodeImage: signedUrl,
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
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive field is required and must be a boolean",
      });
      return;
    }

    const subscription = await DoctorSubscription.findByIdAndUpdate(
      id,
      { isActive },
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

    if (!subscriptions || subscriptions.length === 0) {
      res.status(404).json({
        success: false,
        message: "No subscriptions found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Subscriptions fetched successfully",
      data: subscriptions,
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

    res.status(200).json({
      success: true,
      message: "Active subscriptions fetched successfully",
      data: activeSubscriptions,
    });
  } catch (error) {
    console.error("Error fetching active subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active subscriptions",
    });
  }
};