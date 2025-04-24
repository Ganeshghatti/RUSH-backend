"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Client = exports.snsClient = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const client_sns_1 = require("@aws-sdk/client-sns");
const client_s3_1 = require("@aws-sdk/client-s3");
dotenv_1.default.config();
// Configure SNS client
exports.snsClient = new client_sns_1.SNSClient({
    region: process.env.AWS_SNS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_SNS_ACCESS_KEY || "",
        secretAccessKey: process.env.AWS_SNS_SECRET_KEY || "",
    },
});
// Configure S3 client
exports.s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_S3_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY || process.env.AWS_SNS_ACCESS_KEY || "",
        secretAccessKey: process.env.AWS_S3_SECRET_KEY || process.env.AWS_SNS_SECRET_KEY || "",
    },
});
