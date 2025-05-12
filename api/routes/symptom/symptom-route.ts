import { Router } from "express";
import { searchSymptoms, getAllUniqueSpecialist } from "../../controller/symptom/symptom";
import { searchDoctor } from "../../controller/doctor/search";

const router = Router();

router.route("/symptoms/search").get(searchSymptoms);
router.route("/specialists").get(getAllUniqueSpecialist);
router.route("/search/doctor").get(searchDoctor);

export default router;