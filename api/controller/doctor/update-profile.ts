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
    const updateData = req.body.data ? JSON.parse(req.body.data) : req.body;
    const files = req.files || {};

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
      return;
    }

    const user = await User.findById(doctor.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    const generateS3Key = (file: Express.Multer.File): { key: string; fileName: string } => {
      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const fileName = `${path.basename(originalName, extension)}_${timestamp}${extension}`;
      const key = `uploads/${fileName}`;
      return { key, fileName };
    };

    const uploadPromises: Promise<string>[] = [];
    const fileKeys: string[] = [];

    if (files['profilePic']?.[0]) {
      const { key, fileName } = generateS3Key(files['profilePic'][0]);
      uploadPromises.push(UploadImgToS3({
        key,
        fileBuffer: files['profilePic'][0].buffer,
        fileName
      }));
      fileKeys.push('profilePic');
    }

    if (files['personalIdProofImage']?.[0]) {
      const { key, fileName } = generateS3Key(files['personalIdProofImage'][0]);
      uploadPromises.push(UploadImgToS3({
        key,
        fileBuffer: files['personalIdProofImage'][0].buffer,
        fileName
      }));
      fileKeys.push('personalIdProofImage');
    }

    if (files['addressProofImage']?.[0]) {
      const { key, fileName } = generateS3Key(files['addressProofImage'][0]);
      uploadPromises.push(UploadImgToS3({
        key,
        fileBuffer: files['addressProofImage'][0].buffer,
        fileName
      }));
      fileKeys.push('addressProofImage');
    }

    if (files['taxProofImage']?.[0]) {
      const { key, fileName } = generateS3Key(files['taxProofImage'][0]);
      uploadPromises.push(UploadImgToS3({
        key,
        fileBuffer: files['taxProofImage'][0].buffer,
        fileName
      }));
      fileKeys.push('taxProofImage');
    }

    if (files['upiQrImage']?.[0]) {
      const { key, fileName } = generateS3Key(files['upiQrImage'][0]);
      uploadPromises.push(UploadImgToS3({
        key,
        fileBuffer: files['upiQrImage'][0].buffer,
        fileName
      }));
      fileKeys.push('upiQrImage');
    }

    if (files['signatureImage']?.[0]) {
      const { key, fileName } = generateS3Key(files['signatureImage'][0]);
      uploadPromises.push(UploadImgToS3({
        key,
        fileBuffer: files['signatureImage'][0].buffer,
        fileName
      }));
      fileKeys.push('signatureImage');
    }

    const degreeImagePromises: Promise<string>[] = [];
    if (files['degreeImages']) {
      files['degreeImages'].forEach((file) => {
        const { key, fileName } = generateS3Key(file);
        degreeImagePromises.push(UploadImgToS3({
          key,
          fileBuffer: file.buffer,
          fileName
        }));
      });
    }

    const licenseImagePromises: Promise<string>[] = [];
    if (files['licenseImages']) {
      files['licenseImages'].forEach((file) => {
        const { key, fileName } = generateS3Key(file);
        licenseImagePromises.push(UploadImgToS3({
          key,
          fileBuffer: file.buffer,
          fileName
        }));
      });
    }

    const uploadedUrls = await Promise.all(uploadPromises);
    const uploadedDegreeUrls = await Promise.all(degreeImagePromises);
    const uploadedLicenseUrls = await Promise.all(licenseImagePromises);

    let urlIndex = 0;
    const urlMap: { [key: string]: string | string[] } = {};
    fileKeys.forEach((key) => {
      urlMap[key] = uploadedUrls[urlIndex];
      urlIndex++;
    });

    if (updateData.user) {
      const userUpdateData = updateData.user;
      
      if (userUpdateData.firstName) user.firstName = userUpdateData.firstName;
      if (userUpdateData.lastName) user.lastName = userUpdateData.lastName;
      if (userUpdateData.countryCode) user.countryCode = userUpdateData.countryCode;
      
      if (urlMap['profilePic']) {
        user.profilePic = urlMap['profilePic'] as string;
      } else if (userUpdateData.profilePic) {
        user.profilePic = userUpdateData.profilePic;
      }
      
      if (userUpdateData.address) {
        user.address = {
          ...user.address,
          ...userUpdateData.address
        };
      }

      if (userUpdateData.personalIdProof || urlMap['personalIdProofImage']) {
        user.personalIdProof = {
          ...user.personalIdProof,
          ...userUpdateData.personalIdProof,
          ...(urlMap['personalIdProofImage'] ? { image: urlMap['personalIdProofImage'] } : {})
        };
      }

      if (userUpdateData.addressProof || urlMap['addressProofImage']) {
        user.addressProof = {
          ...user.addressProof,
          ...userUpdateData.addressProof,
          ...(urlMap['addressProofImage'] ? { image: urlMap['addressProofImage'] } : {})
        };
      }

      if (userUpdateData.bankDetails || urlMap['upiQrImage']) {
        user.bankDetails = {
          ...user.bankDetails,
          ...userUpdateData.bankDetails,
          ...(urlMap['upiQrImage'] ? { upiQrImage: urlMap['upiQrImage'] } : {})
        };
      }

      if (userUpdateData.taxProof || urlMap['taxProofImage']) {
        user.taxProof = {
          ...user.taxProof,
          ...userUpdateData.taxProof,
          ...(urlMap['taxProofImage'] ? { image: urlMap['taxProofImage'] } : {})
        };
      }

      await user.save();
    }

    if (updateData.doctor) {
      const doctorUpdateData = updateData.doctor;

      if (doctorUpdateData.qualifications) {
        doctor.qualifications = doctorUpdateData.qualifications.map((qual: any, index: number) => {
          if (qual.degreeImage) {
            return qual;
          }
          if (uploadedDegreeUrls[index]) {
            return {
              ...qual,
              degreeImage: uploadedDegreeUrls[index]
            };
          }
          return qual;
        });
      }

      if (doctorUpdateData.registration) {
        doctor.registration = doctorUpdateData.registration.map((reg: any, index: number) => {
          if (reg.licenseImage) {
            return reg;
          }
          if (uploadedLicenseUrls[index]) {
            return {
              ...reg,
              licenseImage: uploadedLicenseUrls[index]
            };
          }
          return reg;
        });
      }

      if (doctorUpdateData.specialization) {
        doctor.specialization = doctorUpdateData.specialization;
      }

      if (doctorUpdateData.experience) {
        doctor.experience = doctorUpdateData.experience;
      }

      if (urlMap['signatureImage']) {
        doctor.signatureImage = urlMap['signatureImage'] as string;
      } else if (doctorUpdateData.signatureImage) {
        doctor.signatureImage = doctorUpdateData.signatureImage;
      }

      await doctor.save();
    }

    const updatedDoctor = await Doctor.findById(doctorId)
      .populate('userId')
      .lean();

    const doctorWithSignedUrls = await generateSignedUrlsForUser(updatedDoctor);

    res.status(200).json({
      success: true,
      data: doctorWithSignedUrls,
      message: "Doctor profile updated successfully"
    });

  } catch (error: any) {
    console.error("Error updating doctor profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating doctor profile",
      error: error.message
    });
  }
}; 