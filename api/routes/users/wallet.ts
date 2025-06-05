import { Router } from "express";
import { verifyToken } from "../../middleware/auth-middleware";
import { updateWallet, deductWallet } from "../../controller/users/wallet";
import { RequestHandler } from "express";

const router = Router();

router.route("/add/wallet").put(verifyToken as RequestHandler, updateWallet as RequestHandler);
router.route("/deduct/wallet").put(verifyToken as RequestHandler, deductWallet as RequestHandler);
export default router; 