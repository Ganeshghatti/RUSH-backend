import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { updateDoctorProfile } from "../../controller/doctor/update-profile";
import multer from "multer";
import path from "path";
import { RequestHandler } from "express";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
    }
  },
});

// Multer middleware for multiple fields
const uploadFields = upload.fields([
  { name: "degreeImages", maxCount: 10 },
  { name: "licenseImages", maxCount: 10 },
  { name: "signatureImage", maxCount: 1 },
  { name: "taxProofImage", maxCount: 1 },
  { name: "upiQrImage", maxCount: 1 },
  { name: "profilePic", maxCount: 1 },
  { name: "personalIdProofImage", maxCount: 1 },
  { name: "addressProofImage", maxCount: 1 }
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