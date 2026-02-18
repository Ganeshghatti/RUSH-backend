"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadImgToS3 = exports.getKeyFromSignedUrl = exports.GetSignedUrl = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
dotenv_1.default.config({ path: path_1.default.join(__dirname, "..", "..", "api", ".env") });
const s3 = new client_s3_1.S3Client({ region: process.env.AWS_S3_REGION_NAME });
/** Decode key so it matches S3 (Node URL.pathname is percent-encoded). */
function decodeS3Key(key) {
    try {
        return decodeURIComponent(key);
    }
    catch (_a) {
        return key;
    }
}
const GetSignedUrl = (key) => __awaiter(void 0, void 0, void 0, function* () {
    const decodedKey = decodeS3Key(key);
    const command = new client_s3_1.GetObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: decodedKey
    });
    try {
        const url = yield (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 7200 }); // 2 hrs
        return url;
    }
    catch (error) {
        console.error("Error generating presigned URL:", error);
        throw error;
    }
});
exports.GetSignedUrl = GetSignedUrl;
const getKeyFromSignedUrl = (presignedUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = new URL(presignedUrl);
        const pathname = url.pathname;
        const key = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        return decodeS3Key(key);
    }
    catch (error) {
        console.error("Error parsing URL:", error);
        return null;
    }
});
exports.getKeyFromSignedUrl = getKeyFromSignedUrl;
const UploadImgToS3 = (_a) => __awaiter(void 0, [_a], void 0, function* ({ key, fileBuffer, fileName }) {
    // console.log("Uploading to S3:", {
    //   bucket: process.env.AWS_STORAGE_BUCKET_NAME,
    //   key,
    //   fileName,
    // });
    const command = new client_s3_1.PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: getContentType({ fileName }),
        // Removed ACL: "public-read" to avoid AccessControlListNotSupported error
    });
    try {
        const response = yield s3.send(command);
        // console.log("S3 upload response:", response);
        const url = `https://${process.env.AWS_STORAGE_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION_NAME}.amazonaws.com/${key}`;
        // console.log("File uploaded successfully:", response);
        // console.log("Custom key url:", url);
        // console.log("key from fun.:", key);
        // const signedUrl = await GetSignedUrl(key);
        // console.log("Signed URL:", signedUrl);
        return key;
    }
    catch (err) {
        console.error("Detailed S3 error:", {
            name: err.name,
            message: err.message,
            code: err.code,
            stack: err.stack,
        });
        throw err;
    }
});
exports.UploadImgToS3 = UploadImgToS3;
const getContentType = ({ fileName }) => {
    const ext = path_1.default.extname(fileName).toLowerCase();
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
