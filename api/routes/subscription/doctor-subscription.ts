import { createSubscription, updateSubscription, getSubscriptions } from '../../controller/subscription/subscription';
import { verifyToken, checkRole } from '../../middleware/auth-middleware';
import { subscribeDoctor } from '../../controller/doctor/doctor';
import { Router } from "express";

const router = Router();

// admin only create subscription
router.route("/subscription").post(verifyToken, checkRole("admin"), createSubscription);

// admin only update subscription
router.route("/subscription/:id").put(verifyToken, checkRole("admin"), updateSubscription);

// admin only get all subscriptions
router.route("/subscription").get(verifyToken, checkRole("admin"), getSubscriptions);

// doctor only subscribe to subscription
router.route("/subscription/purchase/:doctorId").post(verifyToken, checkRole("doctor"), subscribeDoctor);

export default router;