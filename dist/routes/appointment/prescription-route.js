"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const prescription_1 = require("../../controller/appointment/prescription");
const router = (0, express_1.Router)();
// get prescription by it's id
router
    .route("/appointment/prescription/:prescriptionId")
    .get(auth_middleware_1.verifyToken, prescription_1.getPrescriptionById);
// doctor can add prescription
router
    .route("/doctor/add-prescription")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), prescription_1.addPrescription);
exports.default = router;
