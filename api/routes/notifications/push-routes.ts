import { Router } from "express";
import { saveToken } from "../../controller/notifications/push-controller";

const router = Router();

router.post("/save-token", saveToken);

export default router;
