import axios from "axios";

export const razorpayAxios = axios.create({
  baseURL: "https://api.razorpay.com/v1",
  auth: {
    username: process.env.RAZ_KEY_ID!,
    password: process.env.RAZ_KEY_SECRET!,
  },
});
