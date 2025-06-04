import { Router } from "express";
import { verifyToken } from "../../middleware/auth-middleware";
import { updateWallet } from "../../controller/users/wallet";
import { RequestHandler } from "express";

const router = Router();

router.route("/add/wallet").put(verifyToken as RequestHandler, updateWallet as RequestHandler);

export default router; 