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
exports.DeleteMediaFromS3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.join(__dirname, "..", "..", "api", ".env") });
const s3 = new client_s3_1.S3Client({ region: process.env.AWS_S3_REGION_NAME });
/**
 * Delete a file from S3 bucket using its key
 * @param {string} key - The S3 key (path) of the file to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful
 */
const DeleteMediaFromS3 = (_a) => __awaiter(void 0, [_a], void 0, function* ({ key }) {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: key,
    });
    try {
        yield s3.send(command);
        return true;
    }
    catch (err) {
        console.error("Error deleting from S3:", err);
        throw err;
    }
});
exports.DeleteMediaFromS3 = DeleteMediaFromS3;
