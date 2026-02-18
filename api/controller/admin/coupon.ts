import { Request, Response } from "express";
import DoctorSubscriptionCoupon from "../../models/doctor-subscription-coupon";

export const getCoupons = async (req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await DoctorSubscriptionCoupon.find()
      .populate("applicableSubscriptionIds", "name duration price")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Coupons fetched successfully.",
      data: coupons,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load coupons.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const createCoupon = async (req: Request, res: Response): Promise<void> => {
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
        action: "createCoupon:validation",
      });
      return;
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const existing = await DoctorSubscriptionCoupon.findOne({
      code: normalizedCode,
    });
    if (existing) {
      res.status(400).json({
        success: false,
        message: "A coupon with this code already exists.",
        action: "createCoupon:duplicate",
      });
      return;
    }

    const coupon = await DoctorSubscriptionCoupon.create({
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
      message: "Coupon created successfully.",
      data: coupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't create the coupon.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateCoupon = async (req: Request, res: Response): Promise<void> => {
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

    const coupon = await DoctorSubscriptionCoupon.findById(id);
    if (!coupon) {
      res.status(404).json({
        success: false,
        message: "Coupon not found.",
        action: "updateCoupon:not-found",
      });
      return;
    }

    if (code != null) {
      const normalizedCode = String(code).trim().toUpperCase();
      const existing = await DoctorSubscriptionCoupon.findOne({
        code: normalizedCode,
        _id: { $ne: id },
      });
      if (existing) {
        res.status(400).json({
          success: false,
          message: "Another coupon with this code already exists.",
          action: "updateCoupon:duplicate",
        });
        return;
      }
      coupon.code = normalizedCode;
    }
    if (discountPercent != null) coupon.discountPercent = Number(discountPercent);
    if (description != null) coupon.description = description;
    if (Array.isArray(applicableSubscriptionIds))
      coupon.applicableSubscriptionIds = applicableSubscriptionIds;
    if (typeof isActive === "boolean") coupon.isActive = isActive;
    if (validFrom != null) (coupon as any).validFrom = validFrom ? new Date(validFrom) : null;
    if (validUntil != null) (coupon as any).validUntil = validUntil ? new Date(validUntil) : null;
    if (maxUses != null) (coupon as any).maxUses = maxUses === "" ? null : Number(maxUses);

    await coupon.save();

    res.status(200).json({
      success: true,
      message: "Coupon updated successfully.",
      data: coupon,
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the coupon.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const deleteCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const coupon = await DoctorSubscriptionCoupon.findByIdAndDelete(id);
    if (!coupon) {
      res.status(404).json({
        success: false,
        message: "Coupon not found.",
        action: "deleteCoupon:not-found",
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't delete the coupon.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};
