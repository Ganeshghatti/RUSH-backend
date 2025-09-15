"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const patient_subscription_1 = require("../../controller/subscription/patient-subscription");
const auth_middleware_1 = require("../../middleware/auth-middleware");
// import {
//   subscribePatient,
//   verifyPaymentSubscription,
// } from "../../controller/patient/patient";
const express_1 = require("express");
const media_routes_1 = require("../media/media-routes");
const patient_1 = require("../../controller/patient/patient");
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
router
    .route("/subscription/purchase/:patientId")
    .post(auth_middleware_1.verifyToken, media_routes_1.upload.single("paymentImage"), patient_1.subscribePatient);
router
    .route("/subscription/verify-payment")
    .post(auth_middleware_1.verifyToken, patient_1.verifyPaymentSubscription);
router.route("/subscription/active").get(patient_subscription_1.getActiveSubscriptions);
exports.default = router;
