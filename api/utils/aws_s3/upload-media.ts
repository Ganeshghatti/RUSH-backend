import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import  path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", "..", "api", ".env") });

const s3 = new S3Client({ region: process.env.AWS_S3_REGION_NAME });

interface UploadImgToS3Params {
  key: string;
  fileBuffer: Buffer;
  fileName: string;
}

const UploadImgToS3 = async ({ key, fileBuffer, fileName }: UploadImgToS3Params): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_STORAGE_BUCKET_NAME as string,
    Key: key,
    Body: fileBuffer,
    ContentType: getContentType({ fileName }),
  });

  try {
    const response = await s3.send(command);
    const url = `https://${process.env.AWS_STORAGE_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION_NAME}.amazonaws.com/${key}`;
    console.log("File uploaded successfully:", response);
    console.log("File URL:", url);
    return url;
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw err;
  }
};

interface GetContentTypeParams {
  fileName: string;
}

const getContentType = ({ fileName }: GetContentTypeParams): string => {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream"; // Default content type
  }
};

export { UploadImgToS3 };