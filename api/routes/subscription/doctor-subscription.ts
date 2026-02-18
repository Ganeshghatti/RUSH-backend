import {
  createSubscription,
  updateSubscription,
  getSubscriptions,
  getActiveSubscriptions,
  deleteSubscription,
} from "../../controller/subscription/doctor-subscription";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  subscribeDoctor,
  verifyPaymentSubscription,
  validateCoupon,
} from "../../controller/doctor/doctor";
import { Router } from "express";
import { upload } from "../media/media-routes";

const router = Router();

router
  .route("/subscription")
  .post(verifyToken, checkRole("admin"), createSubscription);

router
  .route("/subscription/:id")
  .put(verifyToken, checkRole("admin"), updateSubscription)
  .delete(verifyToken, checkRole("admin"), deleteSubscription);

router
  .route("/subscription")
  .get(verifyToken, checkRole("admin"), getSubscriptions);

router
  .route("/subscription/validate-coupon")
  .post(verifyToken, validateCoupon);

router
  .route("/subscription/purchase/:doctorId")
  .post(verifyToken, upload.single("paymentImage"), subscribeDoctor);

router
  .route("/subscription/verify-payment")
  .post(verifyToken, verifyPaymentSubscription);

router.route("/subscription/active").get(getActiveSubscriptions);

export default router;
