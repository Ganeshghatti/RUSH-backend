"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const patient_1 = require("../../controller/patient/patient");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const express_1 = require("express");
const settings_1 = require("../../controller/patient/settings");
const family_1 = require("../../controller/patient/family");
const health_metrics_1 = require("../../controller/patient/health-metrics");
const router = (0, express_1.Router)();
router.route("/dashboard").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), patient_1.getPatientDashboard);
// patients settings route
router.route("/profile/personal-info").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), settings_1.updatePersonalInfo);
router.route("/profile/identity-proof").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), settings_1.updateIdentityProof);
router.route("/profile/insurance-details").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), settings_1.updateInsuranceDetails);
router.route("/profile/bank-detail").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), settings_1.updateBankDetail);
router.route("/appointments/doctor").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), patient_1.getAppointmentsDoctorForPatient);
// health metrics: GET list (current patient), GET by id, POST create/update
router.route("/health-metrics").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), health_metrics_1.getHealthMetrics);
router.route("/health-metrics").post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), health_metrics_1.addOrUpdateHealthMetrics);
router.route("/health-metrics/:healthMetricsId").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), health_metrics_1.getHealthMetricsById);
router.route("/family").post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), family_1.addFamily);
router.route("/family").get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), family_1.getFamilyDetails);
router.route("/family/:familyId").put(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), family_1.updateFamily);
router.route("/family/:familyId").delete(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), family_1.removeFamily);
router.route("/user/:userId").get(auth_middleware_1.verifyToken, patient_1.getPatientById);
exports.default = router;
