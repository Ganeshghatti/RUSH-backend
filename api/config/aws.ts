import dotenv from "dotenv";
import { SNSClient } from "@aws-sdk/client-sns";
import { S3Client } from "@aws-sdk/client-s3";

dotenv.config();

// Configure SNS client
export const snsClient = new SNSClient({
  region: process.env.AWS_SNS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_SNS_ACCESS_KEY || "",
    secretAccessKey: process.env.AWS_SNS_SECRET_KEY || "",
  },
});

// Configure S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || "ap-south-1",
  credentials: {
    accessKeyId:
      process.env.AWS_S3_ACCESS_KEY || process.env.AWS_SNS_ACCESS_KEY || "",
    secretAccessKey:
      process.env.AWS_S3_SECRET_KEY || process.env.AWS_SNS_SECRET_KEY || "",
  },
});
