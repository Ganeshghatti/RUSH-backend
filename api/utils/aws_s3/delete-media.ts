import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", "..", "api", ".env") });

const s3 = new S3Client({ region: process.env.AWS_S3_REGION_NAME });

interface DeleteMediaFromS3Params {
  key: string;
}

/**
 * Delete a file from S3 bucket using its key
 * @param {string} key - The S3 key (path) of the file to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
const DeleteMediaFromS3 = async ({ key }: DeleteMediaFromS3Params): Promise<boolean> => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_STORAGE_BUCKET_NAME as string,
    Key: key,
  });

  try {
    await s3.send(command);
    return true;
  } catch (err) {
    console.error("Error deleting from S3:", err);
    throw err;
  }
};

export { DeleteMediaFromS3 };