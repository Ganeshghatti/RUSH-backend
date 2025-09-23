"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_1 = require("./../../controller/admin/admin");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const express_1 = require("express");
const unregistered_patient_1 = require("../../controller/admin/unregistered-patient");
const transaction_1 = require("../../controller/admin/transaction");
const router = (0, express_1.Router)();
router.route("/admin/doctors").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), admin_1.getAllDoctors);
router.route("/admin/patients").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), admin_1.getAllPatients);
router.route("/admin/doctor/verification/:doctorId").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), admin_1.updateDoctorStatus);
router.route("/admin/user/verification/:userId").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), admin_1.updateDocumentVerificationStatus);
router.route("/admin/addpatient").post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), unregistered_patient_1.addUnregisteredPatient);
/***router.post("/admin/addpatient", verifyToken, checkRole("admin"), addUnregisteredPatient)***/
router.route("/admin/getpatient").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), unregistered_patient_1.getUnregisteredPatient);
router.route("/admin/debit/requests").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), transaction_1.getPendingDebitRequests);
router.route("/admin/debit/process").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), transaction_1.processDebitRequest);
router.route("/admin/transactions").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("admin"), transaction_1.getTransactionsByDate);
exports.default = router;
