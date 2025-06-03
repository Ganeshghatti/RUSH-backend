import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import path from "path";
import { generateSignedUrlsForUser } from "../../utils/signed-url";
import { getKeyFromSignedUrl } from "../../utils/aws_s3/upload-media";

interface MulterRequest extends Request {
  files?: { [fieldname: string]: Express.Multer.File[] };
}

export const updateDoctorProfile = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const doctorId = req.params.doctorId;
    let updateData;
    try {
      updateData = req.body.data ? JSON.parse(req.body.data) : req.body;
    } catch (parseError: any) {
      res.status(400).json({
        success: false,
        message: "Invalid JSON format in 'data' field",
        error: parseError.message,
      });
      return;
    }

    const files = req.files || {};

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({ success: false, message: "Doctor not found" });
      return;
    }

    const user = await User.findById(doctor.userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const generateS3Key = (file: Express.Multer.File): { key: string; fileName: string } => {
      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const fileName = `${path.basename(originalName, extension)}_${timestamp}${extension}`;
      const key = `Uploads/${fileName}`;
      return { key, fileName };
    };

    // Helper function to extract S3 key from presigned URL or return the URL as is
    const getS3KeyFromUrl = async (url: string): Promise<string> => {
      try {
        if (url.includes('X-Amz-Algorithm')) {
          // This is a presigned URL, extract the key
          const key = await getKeyFromSignedUrl(url);
          return key || '';
        } else {
          // This might already be a key or a regular S3 URL
          return url;
        }
      } catch (error) {
        console.error('Error extracting key from URL:', error);
        return url; // Return original URL if extraction fails
      }
    };

    // Define file field mappings
    const fileFieldConfig = [
      { fieldName: "profilePic", modelPath: "profilePic", isArray: false, target: "user" },
      { fieldName: "personalIdProofImage", modelPath: "personalIdProof.image", isArray: false, target: "user" },
      { fieldName: "addressProofImage", modelPath: "addressProof.image", isArray: false, target: "user" },
      { fieldName: "taxProofImage", modelPath: "taxProof.image", isArray: false, target: "user" },
      { fieldName: "upiQrImage", modelPath: "bankDetails.upiQrImage", isArray: false, target: "user" },
      { fieldName: "signatureImage", modelPath: "signatureImage", isArray: false, target: "doctor" },
      { fieldName: "degreeImages", modelPath: "qualifications", isArray: true, target: "doctor", imageKey: "degreeImage" },
      { fieldName: "licenseImages", modelPath: "registration", isArray: true, target: "doctor", imageKey: "licenseImage" },
    ];

    // Process file uploads and URL conversions
    const urlMap: { [key: string]: string | string[] } = {};

    for (const config of fileFieldConfig) {
      const { fieldName, modelPath, isArray, target, imageKey }: any = config;
      const fileList = files[fieldName];

      if (isArray) {
        // Handle array fields (e.g., degreeImages, licenseImages)
        const arrayData = target === "doctor" ? updateData.doctor?.[modelPath] || [] : updateData.user?.[modelPath] || [];
        const keysToAssign: string[] = new Array(arrayData.length).fill(null);

        // Process existing URLs from data field (convert presigned URLs to keys)
        for (let i = 0; i < arrayData.length; i++) {
          const item = arrayData[i];
          if (item?.[imageKey]) {
            keysToAssign[i] = await getS3KeyFromUrl(item[imageKey]);
          }
        }

        // Upload new files for indices without keys (where form data files are provided)
        if (fileList) {
          let fileIndex = 0;
          for (let i = 0; i < keysToAssign.length && fileIndex < fileList.length; i++) {
            if (!keysToAssign[i]) {
              const { key, fileName } = generateS3Key(fileList[fileIndex]);
              const s3Url = await UploadImgToS3({ key, fileBuffer: fileList[fileIndex].buffer, fileName });
              keysToAssign[i] = key; // Store the key, not the full URL
              fileIndex++;
            }
          }
        }

        urlMap[fieldName] = keysToAssign;
      } else {
        // Handle single-file fields (e.g., profilePic)
        const existingUrl = target === "doctor" 
          ? updateData.doctor?.[modelPath]
          : modelPath.includes('.') 
            ? updateData.user?.[modelPath.split(".")[0]]?.[modelPath.split(".").slice(-1)[0]]
            : updateData.user?.[modelPath];

        if (existingUrl) {
          // Convert presigned URL to key if it's a presigned URL
          urlMap[fieldName] = await getS3KeyFromUrl(existingUrl);
        } else if (fileList?.[0]) {
          // Upload new file and store the key
          const { key, fileName } = generateS3Key(fileList[0]);
          await UploadImgToS3({ key, fileBuffer: fileList[0].buffer, fileName });
          urlMap[fieldName] = key; // Store the key, not the full URL
        }
      }
    }

    // Update User data
    if (updateData.user) {
      const userUpdateData = updateData.user;

      if (userUpdateData.firstName) user.firstName = userUpdateData.firstName;
      if (userUpdateData.lastName) user.lastName = userUpdateData.lastName;
      if (userUpdateData.countryCode) user.countryCode = userUpdateData.countryCode;

      if (urlMap["profilePic"]) {
        user.profilePic = urlMap["profilePic"] as string;
      }

      if (userUpdateData.address) {
        user.address = { ...user.address, ...userUpdateData.address };
      }

      if (userUpdateData.personalIdProof || urlMap["personalIdProofImage"]) {
        user.personalIdProof = {
          ...user.personalIdProof,
          ...userUpdateData.personalIdProof,
          ...(urlMap["personalIdProofImage"] ? { image: urlMap["personalIdProofImage"] } : {}),
        };
      }

      if (userUpdateData.addressProof || urlMap["addressProofImage"]) {
        user.addressProof = {
          ...user.addressProof,
          ...userUpdateData.addressProof,
          ...(urlMap["addressProofImage"] ? { image: urlMap["addressProofImage"] } : {}),
        };
      }

      if (userUpdateData.bankDetails || urlMap["upiQrImage"]) {
        user.bankDetails = {
          ...user.bankDetails,
          ...userUpdateData.bankDetails,
          ...(urlMap["upiQrImage"] ? { upiQrImage: urlMap["upiQrImage"] } : {}),
        };
      }

      if (userUpdateData.taxProof || urlMap["taxProofImage"]) {
        user.taxProof = {
          ...user.taxProof,
          ...userUpdateData.taxProof,
          ...(urlMap["taxProofImage"] ? { image: urlMap["taxProofImage"] } : {}),
        };
      }

      await user.save();
    }

    // Update Doctor data
    if (updateData.doctor) {
      const doctorUpdateData = updateData.doctor;

      if (doctorUpdateData.qualifications) {
        const uploadedDegreeKeys = urlMap["degreeImages"] as string[] || [];
        doctor.qualifications = doctorUpdateData.qualifications.map((qual: any, index: number) => ({
          ...qual,
          degreeImage: uploadedDegreeKeys[index] || qual.degreeImage,
        }));
      }

      if (doctorUpdateData.registration) {
        const uploadedLicenseKeys = urlMap["licenseImages"] as string[] || [];
        doctor.registration = doctorUpdateData.registration.map((reg: any, index: number) => ({
          ...reg,
          licenseImage: uploadedLicenseKeys[index] || reg.licenseImage,
        }));
      }

      if (doctorUpdateData.specialization) {
        doctor.specialization = doctorUpdateData.specialization;
      }

      if (doctorUpdateData.experience) {
        doctor.experience = doctorUpdateData.experience;
      }

      if (urlMap["signatureImage"]) {
        doctor.signatureImage = urlMap["signatureImage"] as string;
      }

      await doctor.save();
    }

    const updatedDoctor = await Doctor.findById(doctorId).populate("userId").lean();
    const doctorWithSignedUrls = await generateSignedUrlsForUser(updatedDoctor);

    res.status(200).json({
      success: true,
      data: doctorWithSignedUrls,
      message: "Doctor profile updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating doctor profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating doctor profile",
      error: error.message,
    });
  }
};

export const updateDoctorOnlineAppointment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { availability, duration, isActive } = req.body;

    // Validate doctorId
    if (!doctorId) {
      res.status(400).json({
        success: false,
        message: "Doctor ID is required",
      });
      return;
    }

    const updateFields: any = {};

    // Handle availability update if provided
    if (availability) {
      // Validate availability data
      if (!Array.isArray(availability)) {
        res.status(400).json({
          success: false,
          message: "Valid availability array is required",
        });
        return;
      }

      // Validate each availability entry
      for (const slot of availability) {
        if (!slot.day || !Array.isArray(slot.duration)) {
          res.status(400).json({
            success: false,
            message: "Each availability slot must have a day and duration array",
          });
          return;
        }

        // Validate day value
        const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        if (!validDays.includes(slot.day.toLowerCase())) {
          res.status(400).json({
            success: false,
            message: `Invalid day value. Must be one of: ${validDays.join(", ")}`,
          });
          return;
        }

        // Validate duration entries
        for (const duration of slot.duration) {
          if (!duration.start || !duration.end) {
            res.status(400).json({
              success: false,
              message: "Each duration must have start and end times",
            });
            return;
          }
        }
      }

      updateFields["onlineAppointment.availability"] = availability;
    }

    // Handle duration update if provided
    if (duration) {
      // Validate duration data
      if (!Array.isArray(duration)) {
        res.status(400).json({
          success: false,
          message: "Valid duration array is required",
        });
        return;
      }

      // Validate each duration entry
      for (const slot of duration) {
        if (!slot.minute || !slot.price) {
          res.status(400).json({
            success: false,
            message: "Each duration slot must have minute and price",
          });
          return;
        }

        // Validate minute value
        if (![15, 30].includes(slot.minute)) {
          res.status(400).json({
            success: false,
            message: "Duration minute must be either 15 or 30",
          });
          return;
        }

        // Validate price value
        if (typeof slot.price !== 'number' || slot.price <= 0) {
          res.status(400).json({
            success: false,
            message: "Price must be a positive number",
          });
          return;
        }
      }

      updateFields["onlineAppointment.duration"] = duration;
    }

    // Handle isActive update if provided
    if (typeof isActive === 'boolean') {
      updateFields["onlineAppointment.isActive"] = isActive;
    }

    // If neither availability, duration, nor isActive is provided
    if (Object.keys(updateFields).length === 0) {
      res.status(400).json({
        success: false,
        message: "Either availability, duration, or isActive must be provided",
      });
      return;
    }

    // Update the doctor's online appointment settings
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        $set: {
          ...updateFields,
          "onlineAppointment.updatedAt": new Date()
        },
      },
      { new: true }
    ).populate("userId");

    if (!updatedDoctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    const doctorWithSignedUrls = await generateSignedUrlsForUser(updatedDoctor);

    res.status(200).json({
      success: true,
      data: doctorWithSignedUrls,
      message: "Online appointment settings updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating online appointment settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating online appointment settings",
      error: error.message,
    });
  }
};