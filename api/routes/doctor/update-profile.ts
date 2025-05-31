import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { updateDoctorProfile } from "../../controller/doctor/update-profile";
import multer from "multer";
import path from "path";
import { RequestHandler } from "express";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage()
});

// Multer middleware for multiple fields without restrictions
const uploadFields = upload.fields([
  { name: "degreeImages" },
  { name: "licenseImages" },
  { name: "signatureImage" },
  { name: "taxProofImage" },
  { name: "upiQrImage" },
  { name: "profilePic" },
  { name: "personalIdProofImage" },
  { name: "addressProofImage" }
]);

// Route for updating doctor profile
router.route("/doctor/profile/:doctorId")
  .put(
    verifyToken as RequestHandler, 
    checkRole("doctor") as RequestHandler, 
    uploadFields as RequestHandler, 
    updateDoctorProfile as RequestHandler
  );

export default router; 