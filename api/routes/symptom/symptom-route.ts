import { Router } from "express";
import { searchSymptoms, getAllUniqueSpecialist } from "../../controller/symptom/symptom";

const router = Router();

router.route("/symptoms/search").get(searchSymptoms);
router.route("/specialists").get(getAllUniqueSpecialist);

export default router;