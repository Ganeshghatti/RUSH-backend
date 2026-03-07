import { Request, Response } from "express";
import PatientSubscriptionCoupon from "../../models/patient-subscription-coupon";

export const getPatientCoupons = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const coupons = await PatientSubscriptionCoupon.find()
      .populate("applicableSubscriptionIds", "name duration price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Patient coupons fetched successfully.",
      data: coupons,
    });
  } catch (error) {
    console.error("Error fetching patient coupons:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load patient coupons.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const createPatientCoupon = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      code,
      discountPercent,
      description,
      applicableSubscriptionIds,
      isActive,
      validFrom,
      validUntil,
      maxUses,
    } = req.body;

    if (!code || discountPercent == null) {
      res.status(400).json({
        success: false,
        message: "Code and discount percent are required.",
        action: "createPatientCoupon:validation",
      });
      return;
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const existing = await PatientSubscriptionCoupon.findOne({
      code: normalizedCode,
    });
    if (existing) {
      res.status(400).json({
        success: false,
        message: "A patient coupon with this code already exists.",
        action: "createPatientCoupon:duplicate",
      });
      return;
    }

    const coupon = await PatientSubscriptionCoupon.create({
      code: normalizedCode,
      discountPercent: Number(discountPercent),
      description: description ?? "",
      applicableSubscriptionIds: Array.isArray(applicableSubscriptionIds)
        ? applicableSubscriptionIds
        : [],
      isActive: isActive !== false,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      maxUses: maxUses != null ? Number(maxUses) : null,
    });

    res.status(201).json({
      success: true,
      message: "Patient coupon created successfully.",
      data: coupon,
    });
  } catch (error) {
    console.error("Error creating patient coupon:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't create the patient coupon.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updatePatientCoupon = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      code,
      discountPercent,
      description,
      applicableSubscriptionIds,
      isActive,
      validFrom,
      validUntil,
      maxUses,
    } = req.body;

    const coupon = await PatientSubscriptionCoupon.findById(id);
    if (!coupon) {
      res.status(404).json({
        success: false,
        message: "Patient coupon not found.",
        action: "updatePatientCoupon:not-found",
      });
      return;
    }

    if (code != null) {
      const normalizedCode = String(code).trim().toUpperCase();
      const existing = await PatientSubscriptionCoupon.findOne({
        code: normalizedCode,
        _id: { $ne: id },
      });
      if (existing) {
        res.status(400).json({
          success: false,
          message: "Another patient coupon with this code already exists.",
          action: "updatePatientCoupon:duplicate",
        });
        return;
      }
      coupon.code = normalizedCode;
    }
    if (discountPercent != null)
      coupon.discountPercent = Number(discountPercent);
    if (description != null) coupon.description = description;
    if (Array.isArray(applicableSubscriptionIds))
      coupon.applicableSubscriptionIds = applicableSubscriptionIds;
    if (typeof isActive === "boolean") coupon.isActive = isActive;
    if (validFrom != null)
      (coupon as any).validFrom = validFrom ? new Date(validFrom) : null;
    if (validUntil != null)
      (coupon as any).validUntil = validUntil ? new Date(validUntil) : null;
    if (maxUses != null)
      (coupon as any).maxUses = maxUses === "" ? null : Number(maxUses);

    await coupon.save();

    res.status(200).json({
      success: true,
      message: "Patient coupon updated successfully.",
      data: coupon,
    });
  } catch (error) {
    console.error("Error updating patient coupon:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the patient coupon.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deletePatientCoupon = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const coupon = await PatientSubscriptionCoupon.findByIdAndDelete(id);
    if (!coupon) {
      res.status(404).json({
        success: false,
        message: "Patient coupon not found.",
        action: "deletePatientCoupon:not-found",
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Patient coupon deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting patient coupon:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't delete the patient coupon.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
