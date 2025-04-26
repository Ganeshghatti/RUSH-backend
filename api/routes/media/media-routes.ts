import express from 'express';
import multer from 'multer';
import path from 'path';
import { UploadImgToS3 } from '../../utils/aws_s3/upload-media';
import { DeleteMediaFromS3 } from '../../utils/aws_s3/delete-media';
import { verifyToken } from '../../middleware/auth-middleware';
import { Request, Response } from 'express';

interface AuthRequest extends Request {
  user?: any; // Made optional to align with Express.Request
  file?: Express.Multer.File;
  files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

const router = express.Router();

const storage = multer.memoryStorage();

// File filter to only allow image files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'));
  }
};

// Set up multer with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Route for uploading a single image

router.post('/upload',verifyToken, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Generate a unique file name with timestamp
    const timestamp = Date.now();
    const originalName = req.file.originalname;
    const extension = path.extname(originalName);
    const fileName = `${path.basename(originalName, extension)}_${timestamp}${extension}`;
    
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
      message: 'Image uploaded successfully',
      data: {
        url: fileUrl,
        key,
        fileName
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// Route for uploading multiple images (up to 5)
// router.post('/upload-multiple', verifyToken, upload.array('images', 5), async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     if (!req.files || req.files.length === 0) {
//       res.status(400).json({ success: false, message: 'No files uploaded' });
//       return;
//     }

//     const uploadedFiles = [];
//     const userId = req.user.id; // From auth middleware
    
//     // Upload each file to S3
//     for (const file of req.files) {
//       const timestamp = Date.now();
//       const originalName = file.originalname;
//       const extension = path.extname(originalName);
//       const fileName = `${path.basename(originalName, extension)}_${timestamp}${extension}`;
      
//       const key = `uploads/${userId}/${fileName}`;
      
//       const fileUrl = await UploadImgToS3({
//         key,
//         fileBuffer: file.buffer,
//         fileName: originalName,
//       });
      
//       uploadedFiles.push({
//         url: fileUrl,
//         key,
//         fileName
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Images uploaded successfully',
//       data: uploadedFiles
//     });
//   } catch (error: any) {
//     console.error('Upload error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to upload images',
//       error: error.message
//     });
//   }
// });

// Route for deleting an image from S3
router.delete('/delete', verifyToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { key } = req.body;
    
    if (!key) {
      res.status(400).json({ success: false, message: 'No file key provided' });
      return 
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
      return
    }

    // Delete from S3
    await DeleteMediaFromS3({ key });

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

export default router;