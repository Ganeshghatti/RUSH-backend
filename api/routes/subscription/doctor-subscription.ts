import {
  createSubscription,
  updateSubscription,
  getSubscriptions,
  getActiveSubscriptions,
} from "../../controller/subscription/subscription";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { subscribeDoctor } from "../../controller/doctor/doctor";
import { Router } from "express";
import { upload } from "../media/media-routes";

const router = Router();

router
  .route("/subscription")
  .post(verifyToken, checkRole("admin"), upload.single("qrCodeImage"), createSubscription);

router
  .route("/subscription/:id")
  .put(verifyToken, checkRole("admin"), updateSubscription);

router
  .route("/subscription")
  .get(verifyToken, checkRole("admin"), getSubscriptions);

router
  .route("/subscription/purchase/:doctorId")
  .post(verifyToken, checkRole("doctor"), subscribeDoctor);

router.route("/subscription/active").get(verifyToken, getActiveSubscriptions);

export default router;
