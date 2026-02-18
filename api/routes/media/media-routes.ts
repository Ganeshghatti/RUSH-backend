import express from "express";
import multer from "multer";
import path from "path";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import { DeleteMediaFromS3 } from "../../utils/aws_s3/delete-media";
import { verifyToken } from "../../middleware/auth-middleware";
import { Request, Response } from "express";
import { getKeyFromSignedUrl } from "../../utils/aws_s3/upload-media";
import uploadPathMap, { type UploadPathType } from "./upload-paths";

interface AuthRequest extends Request {
  user?: any; // Made optional to align with Express.Request
  file?: Express.Multer.File;
  files?:
    | { [fieldname: string]: Express.Multer.File[] }
    | Express.Multer.File[];
}

const storage = multer.memoryStorage();

// Set up multer with basic configuration
export const upload = multer({
  storage: storage,
});

// Route for uploading a single image

const router = express.Router();

router.post(
  "/upload/v1",
  verifyToken,
  upload.single("image"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: "No file uploaded" });
        return;
      }

      // Generate a unique file name with timestamp
      const timestamp = Date.now();
      const originalName = req.file.originalname;
      const extension = path.extname(originalName);
      const fileName = `${path.basename(
        originalName,
        extension
      )}_${timestamp}${extension}`;

      // Create the S3 key (filepath in S3)
      // const userId = req.user.id; // From auth middleware
      const key = `uploads/${fileName}`;

      // Upload to S3
      const fileUrl = await UploadImgToS3({
        key,
        fileBuffer: req.file.buffer,
        fileName: originalName,
      });

      res.status(200).json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          url: fileUrl,
          key,
          fileName,
        },
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload image",
        error: error.message,
      });
    }
  }
);

// Route for uploading multiple images with optional key deletion
router.post(
  "/upload",
  verifyToken,
  upload.array("images"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || !Array.isArray(files) || files.length === 0) {
        res.status(400).json({
          success: false,
          message: "No files uploaded. Please attach one or more images.",
        });
        return;
      }

      const { pathType, familyId } = req.body;
      if (!pathType || !(pathType in uploadPathMap)) {
        // res.status(400).json({
        //   success: false,
        //   message: "Invalid or missing pathType.",
        // });
        // return;

        // get s3Keys from form data and parse if it's a string
        let s3Keys: string[] = [];
        if (req?.body?.s3Keys) {
          s3Keys =
            typeof req.body.s3Keys === "string"
              ? JSON.parse(req.body.s3Keys)
              : req.body.s3Keys;
        }
        // generate the key from pre-signed url if user profiled s3 key with pesgned url thena convert to key
        const parsedS3Keys = await Promise.all(
          s3Keys?.map(async (key) => {
            if (key.includes("https://")) {
              const parsedKey = await getKeyFromSignedUrl(key);
              return parsedKey;
            }
            return key;
          })
        );
        // Upload all images using Promise.all
        const uploadPromises = files?.map((file) => {
          const timestamp = Date.now();
          const originalName = file.originalname;
          const finalKey = `${originalName}`;

          return UploadImgToS3({
            key: finalKey,
            fileBuffer: file.buffer,
            fileName: originalName,
          });
        });
        // Execute all uploads
        const uploadedKeys = await Promise.all(uploadPromises);
        // Delete old images if s3Keys are provided
        if (parsedS3Keys && parsedS3Keys.length > 0) {
          const deletePromises = parsedS3Keys.map((key: string | null) =>
            key ? DeleteMediaFromS3({ key }) : null
          );
          await Promise.all(deletePromises);
        }
        const uploadedFiles = files.map((file, i) => ({
          key: uploadedKeys[i],
          originalName: file.originalname,
        }));

        res.status(200).json({
          success: true,
          message: "Images upload success",
          data: uploadedFiles,
          deletedKeys: parsedS3Keys,
        });
      }

      const userId = req.user.id;
      const typedPathType = pathType as UploadPathType;
      console.log("path type ", typedPathType);
      // Path types that require familyId
      const familyPathTypes: UploadPathType[] = [
        "familyIdProof",
        "familyInsurance",
        "healthMetricsFamily",
      ];

      const requiresFamilyId = familyPathTypes.includes(typedPathType);

      if (requiresFamilyId && !familyId) {
        res.status(400).json({
          success: false,
          message: "familyId is required for this pathType.",
        });
        return;
      }

      const prefix =
        requiresFamilyId && familyId
          ? (
              uploadPathMap[typedPathType] as (
                userId: string,
                familyId: string
              ) => string
            )(userId, familyId)
          : (uploadPathMap[typedPathType] as (userId: string) => string)(
              userId
            );

      // get s3Keys from form data and parse if it's a string
      let s3Keys: string[] = [];
      if (req?.body?.s3Keys) {
        s3Keys =
          typeof req.body.s3Keys === "string"
            ? JSON.parse(req.body.s3Keys)
            : req.body.s3Keys;
      }
      // generate the key from pre-signed url if user profiled s3 key with pesgned url thena convert to key
      const parsedS3Keys = await Promise.all(
        s3Keys?.map(async (key) => {
          if (key.includes("https://")) {
            const parsedKey = await getKeyFromSignedUrl(key);
            return parsedKey;
          }
          return key;
        })
      );

      // Upload all images using Promise.all
      const uploadPromises = files?.map((file) => {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const cleanName = path.basename(originalName, extension);
        const finalName = `${cleanName}_${timestamp}${extension}`;
        const finalKey = `${prefix}${finalName}`;

        return UploadImgToS3({
          key: finalKey,
          fileBuffer: file.buffer,
          fileName: originalName,
        });
      });

      // Execute all uploads
      const uploadedKeys = await Promise.all(uploadPromises);

      // Delete old images if s3Keys are provided
      if (parsedS3Keys && parsedS3Keys.length > 0) {
        const deletePromises = parsedS3Keys.map((key: string | null) =>
          key ? DeleteMediaFromS3({ key }) : null
        );
        await Promise.all(deletePromises);
      }

      // Prepare response data using the same logic as upload
      // const uploadedFiles = files.map((file, index) => {
      //   const timestamp = Date.now();
      //   const originalName = file.originalname;
      //   const extension = path.extname(originalName);
      //   const fileName = `${path.basename(originalName, extension)}_${timestamp}${extension}`;

      //   return {
      //     key: uploadedKeys[index],
      //     fileName: originalName,
      //     uploadedFileName: fileName
      //   };
      // });
      const uploadedFiles = files.map((file, i) => ({
        key: uploadedKeys[i],
        originalName: file.originalname,
      }));

      res.status(200).json({
        success: true,
        message: "Images uploaded successfully",
        data: uploadedFiles,
        deletedKeys: parsedS3Keys,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload images",
        error: error.message,
      });
    }
  }
);

// Route for deleting an image from S3
router.delete("/delete", verifyToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { key } = req.body;

    if (!key) {
      res.status(400).json({ success: false, message: "No file key provided" });
      return;
    }

    // Verify the user has permission to delete this file
    const userId = authReq.user.id;
    // const userId = req.user.id;
    const keyParts = key.split("/");

    // Basic security check to ensure the user can only delete their own files
    if (keyParts.length >= 2 && keyParts[1] !== userId) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this file",
      });
      return;
    }

    // Delete from S3
    await DeleteMediaFromS3({ key });

    res.status(200).json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: error.message,
    });
  }
});

export default router;
