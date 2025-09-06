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
exports.upload = void 0;
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const delete_media_1 = require("../../utils/aws_s3/delete-media");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const upload_media_2 = require("../../utils/aws_s3/upload-media");
const storage = multer_1.default.memoryStorage();
// Set up multer with basic configuration
exports.upload = (0, multer_1.default)({
    storage: storage
});
// Route for uploading a single image
const router = express_1.default.Router();
router.post('/upload/v1', auth_middleware_1.verifyToken, exports.upload.single('image'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        // Generate a unique file name with timestamp
        const timestamp = Date.now();
        const originalName = req.file.originalname;
        const extension = path_1.default.extname(originalName);
        const fileName = `${path_1.default.basename(originalName, extension)}_${timestamp}${extension}`;
        // Create the S3 key (filepath in S3)
        // const userId = req.user.id; // From auth middleware
        const key = `uploads/${fileName}`;
        // console.log("this is the file buffer", req.file.buffer);
        // Upload to S3
        const fileUrl = yield (0, upload_media_1.UploadImgToS3)({
            key,
            fileBuffer: req.file.buffer,
            fileName: originalName,
        });
        // console.log("this is the file url", fileUrl);
        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                url: fileUrl,
                key,
                fileName
            }
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
}));
// Route for uploading multiple images with optional key deletion
router.post('/upload', auth_middleware_1.verifyToken, exports.upload.array('images'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const files = req.files;
        // Get s3Keys from form data and parse if it's a string
        let s3Keys = [];
        if ((_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.s3Keys) {
            s3Keys = typeof req.body.s3Keys === 'string' ? JSON.parse(req.body.s3Keys) : req.body.s3Keys;
        }
        console.log("this is the s3 keys", s3Keys);
        // generate the key from pre-signed url if user profiled s3 key with pesgned url thena convert to key
        const parsedS3Keys = yield Promise.all(s3Keys === null || s3Keys === void 0 ? void 0 : s3Keys.map((key) => __awaiter(void 0, void 0, void 0, function* () {
            if (key.includes('https://')) {
                const parsedKey = yield (0, upload_media_2.getKeyFromSignedUrl)(key);
                return parsedKey;
            }
            return key;
        })));
        console.log("this is the parsed s3 keys", parsedS3Keys);
        // Upload all images using Promise.all
        const uploadPromises = files === null || files === void 0 ? void 0 : files.map((file) => {
            const timestamp = Date.now();
            const originalName = file.originalname;
            const extension = path_1.default.extname(originalName);
            const fileName = `${path_1.default.basename(originalName, extension)}_${timestamp}${extension}`;
            const key = `${originalName}`;
            return (0, upload_media_1.UploadImgToS3)({
                key,
                fileBuffer: file.buffer,
                fileName: originalName,
            });
        });
        // Execute all uploads
        const uploadedKeys = yield Promise.all(uploadPromises);
        // Delete old images if s3Keys are provided
        if (parsedS3Keys && parsedS3Keys.length > 0) {
            const deletePromises = parsedS3Keys.map((key) => key ? (0, delete_media_1.DeleteMediaFromS3)({ key }) : null);
            yield Promise.all(deletePromises);
        }
        // Prepare response data using the same logic as upload
        const uploadedFiles = files.map((file, index) => {
            const timestamp = Date.now();
            const originalName = file.originalname;
            const extension = path_1.default.extname(originalName);
            const fileName = `${path_1.default.basename(originalName, extension)}_${timestamp}${extension}`;
            return {
                key: uploadedKeys[index],
                fileName: originalName,
                uploadedFileName: fileName
            };
        });
        res.status(200).json({
            success: true,
            message: 'Images uploaded successfully',
            data: uploadedFiles,
            deletedKeys: s3Keys
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload images',
            error: error.message
        });
    }
}));
// Route for deleting an image from S3
router.delete('/delete', auth_middleware_1.verifyToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    try {
        const { key } = req.body;
        if (!key) {
            res.status(400).json({ success: false, message: 'No file key provided' });
            return;
        }
        // Verify the user has permission to delete this file
        const userId = authReq.user.id;
        // const userId = req.user.id;
        const keyParts = key.split('/');
        // Basic security check to ensure the user can only delete their own files
        if (keyParts.length >= 2 && keyParts[1] !== userId) {
            res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this file'
            });
            return;
        }
        // Delete from S3
        yield (0, delete_media_1.DeleteMediaFromS3)({ key });
        res.status(200).json({
            success: true,
            message: 'Image deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image',
            error: error.message
        });
    }
}));
exports.default = router;
