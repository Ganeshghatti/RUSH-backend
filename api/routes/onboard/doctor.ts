import { doctorOnboardV2, getDoctorById } from "../../controller/doctor/doctor";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import {
  updatePersonalInfo,
  updateIdentityProof,
  updateInsuranceDetails,
  updateBankDetail,
} from "../../controller/patient/settings";

const router = Router();

// Onboard: JSON body only (media uploaded via /media/upload first)
router
  .route("/onboard/doctor/:userId")
  .post(verifyToken, doctorOnboardV2);
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