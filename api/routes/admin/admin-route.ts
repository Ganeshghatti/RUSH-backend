import { Router } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  getAllDoctors,
  getAllPatients,
  updateDoctorStatus,
  updateDocumentVerificationStatus,
} from "../../controller/admin/admin";
import {
  addUnregisteredPatient,
  getUnregisteredPatient,
} from "../../controller/admin/unregistered-patient";
import {
  getPendingDebitRequests,
  processDebitRequest,
  getTransactionsByDate,
} from "../../controller/admin/transaction";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../../controller/admin/coupon";
import {
  getPatientCoupons,
  createPatientCoupon,
  updatePatientCoupon,
  deletePatientCoupon,
} from "../../controller/admin/coupon-patient";

const router = Router();
const guard = [verifyToken, checkRole("admin")];

// Doctors & patients
router.route("/doctors").get(...guard, getAllDoctors);
router.route("/patients").get(...guard, getAllPatients);
router
  .route("/doctor/verification/:doctorId")
  .put(...guard, updateDoctorStatus);
router
  .route("/user/verification/:userId")
  .put(...guard, updateDocumentVerificationStatus);

// Unregistered patients
router.route("/addpatient").post(...guard, addUnregisteredPatient);
router.route("/getpatient").get(...guard, getUnregisteredPatient);

// Debit & transactions
router.route("/debit/requests").get(...guard, getPendingDebitRequests);
router.route("/debit/process").put(...guard, processDebitRequest);
router.route("/transactions").get(...guard, getTransactionsByDate);

// Doctor coupons
router
  .route("/doctor-coupons")
  .get(...guard, getCoupons)
  .post(...guard, createCoupon);
router
  .route("/doctor-coupons/:id")
  .put(...guard, updateCoupon)
  .delete(...guard, deleteCoupon);

// Patient coupons
router
  .route("/patient-coupons")
  .get(...guard, getPatientCoupons)
  .post(...guard, createPatientCoupon);
router
  .route("/patient-coupons/:id")
  .put(...guard, updatePatientCoupon)
  .delete(...guard, deletePatientCoupon);

export default router;
