import { Request, Response } from "express";
import Doctor from "../../models/user/doctor-model";
import User from "../../models/user/user-model";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import path from "path";
import { generateSignedUrlsForUser } from "../../utils/signed-url";

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

    // Process file uploads
    const urlMap: { [key: string]: string | string[] } = {};

    for (const config of fileFieldConfig) {
      const { fieldName, modelPath, isArray, target, imageKey }: any = config;
      const fileList = files[fieldName];

      if (isArray) {
        // Handle array fields (e.g., degreeImages, licenseImages)
        const arrayData = target === "doctor" ? updateData.doctor?.[modelPath] || [] : updateData.user?.[modelPath] || [];
        const urlsToAssign: string[] = new Array(arrayData.length).fill(null);

        // Preserve existing URLs
        arrayData.forEach((item: any, index: number) => {
          if (item?.[imageKey] ) {
            urlsToAssign[index] = item[imageKey];
          }
        });

        // Upload new files for indices without URLs
        if (fileList) {
          let fileIndex = 0;
          for (let i = 0; i < urlsToAssign.length && fileIndex < fileList.length; i++) {
            if (!urlsToAssign[i]) {
              const { key, fileName } = generateS3Key(fileList[fileIndex]);
              urlsToAssign[i] = await UploadImgToS3({ key, fileBuffer: fileList[fileIndex].buffer, fileName });
              fileIndex++;
            }
          }
        }

        urlMap[fieldName] = urlsToAssign;
      } else {
        // Handle single-file fields (e.g., profilePic)
        const existingUrl =
          target === "doctor"
            ? updateData.doctor?.[modelPath]
            : updateData.user?.[modelPath.split(".")[0]]?.[modelPath.split(".").slice(-1)[0]];
        if (existingUrl) {
          urlMap[fieldName] = existingUrl;
        } else if (fileList?.[0]) {
          const { key, fileName } = generateS3Key(fileList[0]);
          urlMap[fieldName] = await UploadImgToS3({ key, fileBuffer: fileList[0].buffer, fileName });
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
        const uploadedDegreeUrls = urlMap["degreeImages"] as string[] || [];
        doctor.qualifications = doctorUpdateData.qualifications.map((qual: any, index: number) => ({
          ...qual,
          degreeImage: uploadedDegreeUrls[index] || qual.degreeImage,
        }));
      }

      if (doctorUpdateData.registration) {
        const uploadedLicenseUrls = urlMap["licenseImages"] as string[] || [];
        doctor.registration = doctorUpdateData.registration.map((reg: any, index: number) => ({
          ...reg,
          licenseImage: uploadedLicenseUrls[index] || reg.licenseImage,
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