import { verifyToken } from './../../middleware/auth-middleware';
import { Router } from "express";
import { createSubscription } from "../../controller/subscription/subscription";

const router = Router();

router.route("/create-subscription").post(verifyToken, createSubscription);

export default router;
