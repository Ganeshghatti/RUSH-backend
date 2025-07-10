import Razorpay from "razorpay";
import * as dotenv from "dotenv";

dotenv.config();

export const razorpayConfig = new Razorpay({
  key_id: process.env.RAZ_KEY_ID,
  key_secret: process.env.RAZ_KEY_SECRET,
});