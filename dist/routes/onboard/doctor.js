"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const doctor_1 = require("./../../controller/doctor/doctor");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage()
});
// Multer middleware for multiple fields without restrictions
const uploadFields = upload.fields([
    { name: "degreeImages" },
    { name: "licenseImages" },
    { name: "signatureImage" },
    { name: "taxImage" },
    { name: "upiqrImage" },
    { name: "profilePic" },
    { name: "personalIdProofImage" },
    { name: "addressProofImage" }
]);
router.route("/onboard/doctor/:userId").post(auth_middleware_1.verifyToken, uploadFields, doctor_1.doctorOnboardV2);
router.route("/user/:userId").get(doctor_1.getDoctorById);
exports.default = router;
