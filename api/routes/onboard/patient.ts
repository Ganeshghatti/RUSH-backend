import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import { patientOnboard, getPatientDashboard, getAppointmentsDoctorForPatient, addHealthMetrics } from "../../controller/patient/patient";

const router = Router();

router.route("/onboard/patient/:userId").put(verifyToken, checkRole("patient"), patientOnboard);
router.route("/dashboard").get(verifyToken, checkRole("patient"), getPatientDashboard);
router.route("/appointments/doctor").get(verifyToken, checkRole("patient"), getAppointmentsDoctorForPatient);
router.route("/health-metrics").post(verifyToken, checkRole("patient"), addHealthMetrics);

export default router; 