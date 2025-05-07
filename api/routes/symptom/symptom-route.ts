import { Router } from "express";
import { searchSymptoms } from "../../controller/symptom/symptom";

const router = Router();

router.route("/symptoms/search").get(searchSymptoms);

export default router;