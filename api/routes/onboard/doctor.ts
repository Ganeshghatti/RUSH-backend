import { doctorOnboardV2, getDoctorById } from './../../controller/doctor/doctor';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import multer from "multer";
import path from "path";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpe?g|png|pdf|docx?|xlsx?|pptx?|txt|gif|bmp|tiff?|svg|webp/;
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
  { name: "taxImage", maxCount: 1 },
  { name: "upiqrImage", maxCount: 1 },
  { name: "profilePic", maxCount: 1 },
  { name: "personalIdProofImage", maxCount: 1 },
  { name: "addressProofImage", maxCount: 1 },
]);

router.route("/onboard/doctor/:userId").post(verifyToken, uploadFields, doctorOnboardV2);
router.route("/id/:userId").get(verifyToken, getDoctorById);

export default router;