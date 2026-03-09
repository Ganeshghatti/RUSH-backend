"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const admin_1 = require("../../controller/admin/admin");
const unregistered_patient_1 = require("../../controller/admin/unregistered-patient");
const transaction_1 = require("../../controller/admin/transaction");
const coupon_1 = require("../../controller/admin/coupon");
const coupon_patient_1 = require("../../controller/admin/coupon-patient");
const router = (0, express_1.Router)();
const guard = [auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin")];
// Doctors & patients
router.route("/doctors").get(...guard, admin_1.getAllDoctors);
router.route("/patients").get(...guard, admin_1.getAllPatients);
router
    .route("/doctor/verification/:doctorId")
    .put(...guard, admin_1.updateDoctorStatus);
router
    .route("/user/verification/:userId")
    .put(...guard, admin_1.updateDocumentVerificationStatus);
// Unregistered patients
router.route("/addpatient").post(...guard, unregistered_patient_1.addUnregisteredPatient);
router.route("/getpatient").get(...guard, unregistered_patient_1.getUnregisteredPatient);
// Debit & transactions
router.route("/debit/requests").get(...guard, transaction_1.getPendingDebitRequests);
router.route("/debit/process").put(...guard, transaction_1.processDebitRequest);
router.route("/transactions").get(...guard, transaction_1.getTransactionsByDate);
// Doctor coupons
router
    .route("/doctor-coupons")
    .get(...guard, coupon_1.getCoupons)
    .post(...guard, coupon_1.createCoupon);
router
    .route("/doctor-coupons/:id")
    .put(...guard, coupon_1.updateCoupon)
    .delete(...guard, coupon_1.deleteCoupon);
// Patient coupons
router
    .route("/patient-coupons")
    .get(...guard, coupon_patient_1.getPatientCoupons)
    .post(...guard, coupon_patient_1.createPatientCoupon);
router
    .route("/patient-coupons/:id")
    .put(...guard, coupon_patient_1.updatePatientCoupon)
    .delete(...guard, coupon_patient_1.deletePatientCoupon);
exports.default = router;
