import { getPatientById } from './../../controller/patient/patient';
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import { Router } from "express";
import { patientOnboard, getPatientDashboard, getAppointmentsDoctorForPatient, updateHealthMetrics, getHealthMetrics} from "../../controller/patient/patient";
import { updatePersonalInfo, updateIdentityProof, updateInsuranceDetails, updateBankDetail } from '../../controller/patient/settings';
import { addFamily, updateFamily, removeFamily, getFamilyDetails } from "../../controller/patient/family";

const router = Router();

router.route("/onboard/patient/:userId").put(verifyToken, checkRole("patient"), patientOnboard);
router.route("/dashboard").get(verifyToken, checkRole("patient"), getPatientDashboard);

// patients settings route
router.route("/profile/personal-info").put(verifyToken ,checkRole("patient"), updatePersonalInfo);
router.route("/profile/identity-proof").put(verifyToken ,checkRole("patient"), updateIdentityProof);
router.route("/profile/insurance-details").put(verifyToken ,checkRole("patient"), updateInsuranceDetails);
router.route("/profile/bank-detail").put(verifyToken ,checkRole("patient"), updateBankDetail);

router.route("/appointments/doctor").get(verifyToken, checkRole("patient"), getAppointmentsDoctorForPatient);
router.route("/health-metrics").put(verifyToken, checkRole("patient"), updateHealthMetrics);
router.route("/health-metrics").get(verifyToken, checkRole("patient"), getHealthMetrics);
router.route("/family").post(verifyToken, checkRole("patient"), addFamily);
router.route("/family").get(verifyToken, checkRole("patient"), getFamilyDetails);
router.route("/family/:familyId").put(verifyToken, checkRole("patient"), updateFamily);
router.route("/family/:familyId").delete(verifyToken, checkRole("patient"), removeFamily);
router.route("/user/:userId").get(verifyToken, getPatientById);

export default router; 