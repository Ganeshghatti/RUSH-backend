"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const doctor_subscription_1 = require("../../controller/subscription/doctor-subscription");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const doctor_1 = require("../../controller/doctor/doctor");
const express_1 = require("express");
const media_routes_1 = require("../media/media-routes");
const router = (0, express_1.Router)();
router
    .route("/subscription")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), doctor_subscription_1.createSubscription);
router
    .route("/subscription/:id")
    .put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), doctor_subscription_1.updateSubscription)
    .delete(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), doctor_subscription_1.deleteSubscription);
router
    .route("/subscription")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), doctor_subscription_1.getSubscriptions);
router
    .route("/subscription/validate-coupon")
    .post(auth_middleware_1.verifyToken, doctor_1.validateCoupon);
router
    .route("/subscription/purchase/:doctorId")
    .post(auth_middleware_1.verifyToken, media_routes_1.upload.single("paymentImage"), doctor_1.subscribeDoctor);
router
    .route("/subscription/verify-payment")
    .post(auth_middleware_1.verifyToken, doctor_1.verifyPaymentSubscription);
router.route("/subscription/active").get(doctor_subscription_1.getActiveSubscriptions);
exports.default = router;
