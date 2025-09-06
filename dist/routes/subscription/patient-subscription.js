"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const patient_subscription_1 = require("../../controller/subscription/patient-subscription");
const auth_middleware_1 = require("../../middleware/auth-middleware");
// import {
//   subscribePatient,
//   verifyPaymentSubscription,
// } from "../../controller/patient/patient";
const express_1 = require("express");
const router = (0, express_1.Router)();
router
    .route("/subscription")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), patient_subscription_1.createSubscription);
router
    .route("/subscription/:id")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), patient_subscription_1.updateSubscription);
router
    .route("/subscription")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), patient_subscription_1.getSubscriptions);
// router
//   .route("/subscription/purchase/:patientId")
//   .post(verifyToken, upload.single("paymentImage"), subscribePatient);
// router
//   .route("/subscription/verify-payment")
//   .post(verifyToken, verifyPaymentSubscription);
router.route("/subscription/active").get(patient_subscription_1.getActiveSubscriptions);
exports.default = router;
