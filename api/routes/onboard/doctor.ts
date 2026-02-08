import { doctorOnboardV2, getDoctorById } from "../../controller/doctor/doctor";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import multer from "multer";
import {
  updatePersonalInfo,
  updateIdentityProof,
  updateInsuranceDetails,
  updateBankDetail,
} from "../../controller/patient/settings";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

const uploadFields = upload.fields([
  { name: "degreeImages" },
  { name: "licenseImages" },
  { name: "signatureImage" },
  { name: "taxImage" },
  { name: "upiqrImage" },
  { name: "profilePic" },
  { name: "personalIdProofImage" },
  { name: "addressProofImage" },
]);

// Onboard & profile read
router
  .route("/onboard/doctor/:userId")
  .post(verifyToken, uploadFields, doctorOnboardV2);
router.route("/user/:userId").get(getDoctorById);

// Profile settings (same 4 APIs as patient, shared User model)
router
  .route("/profile/personal-info")
  .put(verifyToken, checkRole("doctor"), updatePersonalInfo);
router
  .route("/profile/identity-proof")
  .put(verifyToken, checkRole("doctor"), updateIdentityProof);
router
  .route("/profile/insurance-details")
  .put(verifyToken, checkRole("doctor"), updateInsuranceDetails);
router
  .route("/profile/bank-detail")
  .put(verifyToken, checkRole("doctor"), updateBankDetail);

export default router;