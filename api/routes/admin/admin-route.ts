import { getAllDoctors, updateDoctorStatus, updateDocumentVerificationStatus, getAllPatients } from './../../controller/admin/admin';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import { addUnregisteredPatient, getUnregisteredPatient } from '../../controller/admin/unregistered-patient';
import { getPendingDebitRequests, processDebitRequest, getTransactionsByDate  } from '../../controller/admin/transaction';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../../controller/admin/coupon';

const router = Router();

router.route("/doctors").get(verifyToken, checkRole("admin"), getAllDoctors);
router.route("/patients").get(verifyToken, checkRole("admin"), getAllPatients);
router.route("/doctor/verification/:doctorId").put(verifyToken, checkRole("admin"), updateDoctorStatus);
router.route("/user/verification/:userId").put(verifyToken, checkRole("admin"), updateDocumentVerificationStatus);
router.route("/addpatient").post(verifyToken, checkRole("admin"), addUnregisteredPatient);
router.route("/getpatient").get(verifyToken, checkRole("admin"), getUnregisteredPatient);

router.route("/debit/requests").get(verifyToken, checkRole("admin"), getPendingDebitRequests);
router.route("/debit/process").put(verifyToken, checkRole("admin"), processDebitRequest);
router.route("/transactions").get(verifyToken, checkRole("admin"), getTransactionsByDate);

router.route("/coupons").get(verifyToken, checkRole("admin"), getCoupons).post(verifyToken, checkRole("admin"), createCoupon);
router.route("/coupons/:id").put(verifyToken, checkRole("admin"), updateCoupon).delete(verifyToken, checkRole("admin"), deleteCoupon);

export default router;