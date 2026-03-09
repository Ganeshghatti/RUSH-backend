import {
  createSubscription,
  updateSubscription,
  getSubscriptions,
  getActiveSubscriptions,
} from "../../controller/subscription/patient-subscription";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import { upload } from "../media/media-routes";
import {
  subscribePatient,
  verifyPaymentSubscription,
  validateCoupon,
} from "../../controller/patient/patient";

const router = Router();

router
  .route("/subscription")
  .post(verifyToken, checkRole("admin"), createSubscription);

router
  .route("/subscription/:id")
  .put(verifyToken, checkRole("admin"), updateSubscription);

router
  .route("/subscription")
  .get(verifyToken, checkRole("admin"), getSubscriptions);

router.route("/subscription/validate-coupon").post(verifyToken, validateCoupon);

router
  .route("/subscription/purchase/:patientId")
  .post(verifyToken, upload.single("paymentImage"), subscribePatient);

router
  .route("/subscription/verify-payment")
  .post(verifyToken, verifyPaymentSubscription);

router.route("/subscription/active").get(getActiveSubscriptions);

export default router;
