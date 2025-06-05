import { doctorOnboardV2, getDoctorById } from './../../controller/doctor/doctor';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import multer from "multer";
import path from "path";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage()
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

router.route("/onboard/doctor/:userId").post(verifyToken, uploadFields, doctorOnboardV2);
router.route("/user/:userId").get(verifyToken, getDoctorById);

export default router;