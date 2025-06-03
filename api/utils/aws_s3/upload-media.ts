import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import dotenv from "dotenv";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


dotenv.config({ path: path.join(__dirname, "..", "..", "api", ".env") });

const s3 = new S3Client({ region: process.env.AWS_S3_REGION_NAME });

interface UploadImgToS3Params {
  key: string;
  fileBuffer: Buffer;
  fileName: string;
}

export const GetSignedUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
    Key: key
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 7200 }); // 2 hrs
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
};

export const getKeyFromSignedUrl = async (presignedUrl: string) => {
  try {
    const url = new URL(presignedUrl);
    const pathname = url.pathname;
    const key = pathname.startsWith('/') ? pathname.substring(1) : pathname;
    return key;
  } catch (error) {
    console.error("Error parsing URL:", error);
    return null;
  }
}

const UploadImgToS3 = async ({ key, fileBuffer, fileName }: UploadImgToS3Params): Promise<string> => {
  console.log("Uploading to S3:", {
    bucket: process.env.AWS_STORAGE_BUCKET_NAME,
    key,
    fileName,
  });

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_STORAGE_BUCKET_NAME as string,
    Key: key,
    Body: fileBuffer,
    ContentType: getContentType({ fileName }),
    // Removed ACL: "public-read" to avoid AccessControlListNotSupported error
  });

  try {
    const response = await s3.send(command);
    console.log("S3 upload response:", response);
    const url = `https://${process.env.AWS_STORAGE_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION_NAME}.amazonaws.com/${key}`;
    // console.log("File uploaded successfully:", response);
    // console.log("Custom key url:", url);
    // console.log("key from fun.:", key);
    // const signedUrl = await GetSignedUrl(key);
    // console.log("Signed URL:", signedUrl);
    return key;
  } catch (err: any) {
    console.error("Detailed S3 error:", {
      name: err.name,
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
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
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
};

export { UploadImgToS3 };