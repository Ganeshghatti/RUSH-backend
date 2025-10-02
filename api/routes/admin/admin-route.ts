import { getAllDoctors, updateDoctorStatus, updateDocumentVerificationStatus, getAllPatients } from './../../controller/admin/admin';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import { addUnregisteredPatient, getUnregisteredPatient } from '../../controller/admin/unregistered-patient';
import { getPendingDebitRequests, processDebitRequest, getTransactionsByDate  } from '../../controller/admin/transaction';

const router = Router();

router.route("/admin/doctors").get(verifyToken, checkRole("admin"), getAllDoctors);
router.route("/admin/patients").get(verifyToken, checkRole("admin"), getAllPatients);
router.route("/admin/doctor/verification/:doctorId").put(verifyToken, checkRole("admin"), updateDoctorStatus);
router.route("/admin/user/verification/:userId").put(verifyToken, checkRole("admin"), updateDocumentVerificationStatus);
router.route("/admin/addpatient").post(verifyToken, checkRole("admin"), addUnregisteredPatient)
/***router.post("/admin/addpatient", verifyToken, checkRole("admin"), addUnregisteredPatient)***/
router.route("/admin/getpatient").get(verifyToken, checkRole("admin"), getUnregisteredPatient)

router.route("/admin/debit/requests").get(verifyToken, checkRole("admin"), getPendingDebitRequests);
router.route("/admin/debit/process").put(verifyToken, checkRole("admin"), processDebitRequest);
router.route("/admin/transactions").get(verifyToken, checkRole("admin"), getTransactionsByDate);

export default router;