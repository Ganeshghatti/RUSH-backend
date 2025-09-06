"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.razorpayAxios = void 0;
const axios_1 = __importDefault(require("axios"));
exports.razorpayAxios = axios_1.default.create({
    baseURL: "https://api.razorpay.com/v1",
    auth: {
        username: process.env.RAZ_KEY_ID,
        password: process.env.RAZ_KEY_SECRET,
    },
});
