import { Router } from "express";
import { searchSymptoms, getAllUniqueSpecialist } from "../../controller/symptom/symptom";
import { searchDoctor } from "../../controller/doctor/search";
import { authOptional } from "../../middleware/auth-middleware";

const router = Router();

router.route("/symptoms/search").get(searchSymptoms);
router.route("/specialists").get(getAllUniqueSpecialist);
router.route("/search/doctor").get(authOptional, searchDoctor);

export default router;