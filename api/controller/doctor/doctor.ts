import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Doctor from "../../models/user/doctor-model";
import DoctorSubscription from "../../models/subscription-model";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import path from "path";

export const doctorOnboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const {
      prefix,
      firstName,
      lastName,
      profilePic,
      gender,
      dob,
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      qualifications,
      registration,
      experience,
      taxProof,
    } = req.body;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    // Check if user exists and has doctor role
    const user = await User.findOne({ _id: userId, role: "doctor" });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found or not a doctor",
      });
      return;
    }

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !gender ||
      !dob ||
      !address ||
      !qualifications ||
      !registration ||
      !experience ||
      !bankDetails
    ) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Prepare update data
    const updateData = {
      prefix,
      firstName,
      lastName,
      profilePic,
      gender,
      dob: new Date(dob),
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      qualifications: qualifications,
      registration: registration,
      experience: experience,
      taxProof,
    };

    // Update doctor using discriminator model
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password"); // Exclude password from response

    if (!updatedDoctor) {
      res.status(500).json({
        success: false,
        message: "Failed to update doctor information",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Doctor onboarded successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    console.error("Error in doctor onboarding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to onboard doctor",
      error: (error as Error).message,
    });
  }
};

// export const doctorOnboardV2 = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { userId } = req.params;

//     const {
//       prefix,
//       firstName,
//       lastName,
//       gender,
//       dob,
//       address,
//       personalIdProof,
//       addressProof,
//       bankDetails,
//       qualifications,
//       registration,
//       experience,
//       taxProof,
//     } = req.body;

//     console.log("Request body:", req.body);

//     // Parse JSON strings if sent as strings (common with FormData)
//     const parsedQualifications = typeof qualifications === "string" ? JSON.parse(qualifications) : qualifications;
//     const parsedRegistration = typeof registration === "string" ? JSON.parse(registration) : registration;
//     const parsedExperience = typeof experience === "string" ? JSON.parse(experience) : experience;
//     const parsedPersonalIdProof = typeof personalIdProof === "string" ? JSON.parse(personalIdProof) : personalIdProof;
//     const parsedAddressProof = typeof addressProof === "string" ? JSON.parse(addressProof) : addressProof;
//     const parsedBankDetails = typeof bankDetails === "string" ? JSON.parse(bankDetails) : bankDetails;
//     const parsedTaxProof = typeof taxProof === "string" ? JSON.parse(taxProof) : taxProof;

//     // Validate userId
//     if (!mongoose.Types.ObjectId.isValid(userId)) {
//       res.status(400).json({
//         success: false,
//         message: "Invalid user ID format",
//       });
//       return;
//     }

//     // Check if user exists and has doctor role role: "doctor"
//     const user = await User.findOne({ _id: userId });
//     if (!user) {
//       res.status(404).json({
//         success: false,
//         message: "User not found or not a doctor",
//       });
//       return;
//     }

//     // Handle file uploads
//     const files = req.files as { [fieldname: string]: Express.Multer.File[] };

//     console.log("Files:", files);

//     if (
//       !firstName ||
//       !lastName ||
//       !gender ||
//       !dob ||
//       !address ||
//       !parsedQualifications ||
//       !parsedRegistration ||
//       !parsedExperience ||
//       !parsedBankDetails
//     ) {
//       res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//       return;
//     }

//     // Helper function to generate unique file name and S3 key
//     const generateS3Key = (file: Express.Multer.File): { key: string; fileName: string } => {
//       const timestamp = Date.now();
//       const originalName = file.originalname;
//       const extension = path.extname(originalName);
//       const fileName = `${path.basename(originalName, extension)}_${timestamp}${extension}`;
//       const key = `uploads/${fileName}`;
//       return { key, fileName };
//     };

//     // Upload degreeImages and map to qualifications
//     const degreeImages = files["degreeImages"] || [];
//     let degreeImageUrls: string[] = [];
//     if (degreeImages.length > 0) {
//       degreeImageUrls = await Promise.all(
//         degreeImages.map(async (file) => {
//           const { key, fileName } = generateS3Key(file);
//           return await UploadImgToS3({
//             key,
//             fileBuffer: file.buffer,
//             fileName,
//           });
//         })
//       );
//       parsedQualifications.forEach((qual: any, index: number) => {
//         if (degreeImageUrls[index]) {
//           qual.degreeImage = degreeImageUrls[index];
//         }
//       });
//     }

//     parsedQualifications.forEach((qual: any, index: number) => {
//       qual.degreeImage = degreeImageUrls[index] || qual.degreeImage; // Preserve existing if no new image
//     });

//     // Upload licenseImages and map to registration
//     const licenseImages = files["licenseImages"] || [];
//     let licenseImageUrls: string[] = [];
//     if (licenseImages.length > 0) {
//       licenseImageUrls = await Promise.all(
//         licenseImages.map(async (file) => {
//           const { key, fileName } = generateS3Key(file);
//           return await UploadImgToS3({
//             key,
//             fileBuffer: file.buffer,
//             fileName,
//           });
//         })
//       );
//       parsedRegistration.forEach((reg: any, index: number) => {
//         if (licenseImageUrls[index]) {
//           reg.licenseImage = licenseImageUrls[index];
//         }
//       });
//     }

//     parsedRegistration.forEach((reg: any, index: number) => {
//       reg.licenseImage = licenseImageUrls[index] || reg.licenseImage; // Preserve existing if no new image
//     });

//     // Upload single images
//     const signatureImage = files["signatureImage"]?.[0];
//     const signatureImageUrl = signatureImage
//       ? await UploadImgToS3({
//           key: generateS3Key(signatureImage).key,
//           fileBuffer: signatureImage.buffer,
//           fileName: generateS3Key(signatureImage).fileName,
//         })
//       : undefined;

//     const taxImage = files["taxImage"]?.[0];
//     const taxImageUrl = taxImage
//       ? await UploadImgToS3({
//           key: generateS3Key(taxImage).key,
//           fileBuffer: taxImage.buffer,
//           fileName: generateS3Key(taxImage).fileName,
//         })
//       : undefined;

//     const upiQrImage = files["upiqrImage"]?.[0];
//     const upiQrImageUrl = upiQrImage
//       ? await UploadImgToS3({
//           key: generateS3Key(upiQrImage).key,
//           fileBuffer: upiQrImage.buffer,
//           fileName: generateS3Key(upiQrImage).fileName,
//         })
//       : undefined;

//     const profilePic = files["profilePic"]?.[0];
//     const profilePicUrl = profilePic
//       ? await UploadImgToS3({
//           key: generateS3Key(profilePic).key,
//           fileBuffer: profilePic.buffer,
//           fileName: generateS3Key(profilePic).fileName,
//         })
//       : undefined;

//     const personalIdProofImage = files["personalIdProofImage"]?.[0];
//     const personalIdProofImageUrl = personalIdProofImage
//       ? await UploadImgToS3({
//           key: generateS3Key(personalIdProofImage).key,
//           fileBuffer: personalIdProofImage.buffer,
//           fileName: generateS3Key(personalIdProofImage).fileName,
//         })
//       : undefined;

//     const addressProofImage = files["addressProofImage"]?.[0];
//     const addressProofImageUrl = addressProofImage
//       ? await UploadImgToS3({
//           key: generateS3Key(addressProofImage).key,
//           fileBuffer: addressProofImage.buffer,
//           fileName: generateS3Key(addressProofImage).fileName,
//         })
//       : undefined;

//     // Prepare update data
//     const updateData = {
//       prefix,
//       firstName,
//       lastName,
//       profilePic: profilePicUrl,
//       gender,
//       dob: new Date(dob),
//       address,
//       personalIdProof: {
//         ...parsedPersonalIdProof,
//         image: personalIdProofImageUrl,
//       },
//       addressProof: {
//         ...parsedAddressProof,
//         image: addressProofImageUrl,
//       },
//       bankDetails: {
//         ...parsedBankDetails,
//         upiQrImage: upiQrImageUrl,
//       },
//       qualifications: parsedQualifications,
//       registration: parsedRegistration,
//       experience: parsedExperience,
//       taxProof: {
//         ...parsedTaxProof,
//         image: taxImageUrl,
//       },
//       signatureImage: signatureImageUrl,
//     };

//     // Update doctor using discriminator model
//     const updatedDoctor = await Doctor.findByIdAndUpdate(
//       userId,
//       { $set: updateData },
//       {
//         new: true,
//         runValidators: true,
//       }
//     ).select("-password");

//     if (!updatedDoctor) {
//       res.status(500).json({
//         success: false,
//         message: "Failed to update doctor information",
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       message: "Doctor onboarded successfully",
//       data: updatedDoctor,
//     });
//   } catch (error) {
//     console.error("Error in doctor onboarding:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to onboard doctor",
//       error: (error as Error).message,
//     });
//   }
// };

export const doctorOnboardV2 = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    // Extract and parse the `data` field from FormData
    const data = req.body.data;
    if (!data) {
      res.status(400).json({
        success: false,
        message: "Missing data field in FormData",
      });
      return;
    }

    // Parse JSON string from `data` field
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;

    // Destructure fields from parsedData
    const {
      prefix,
      firstName,
      lastName,
      gender,
      dob,
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      qualifications,
      registration,
      experience,
      taxProof,
    } = parsedData;

    console.log("Parsed data:", parsedData);

    // Parse JSON strings if sent as strings (for nested objects)
    const parsedQualifications =
      typeof qualifications === "string"
        ? JSON.parse(qualifications)
        : qualifications;
    const parsedRegistration =
      typeof registration === "string"
        ? JSON.parse(registration)
        : registration;
    const parsedExperience =
      typeof experience === "string" ? JSON.parse(experience) : experience;
    const parsedPersonalIdProof =
      typeof personalIdProof === "string"
        ? JSON.parse(personalIdProof)
        : personalIdProof;
    const parsedAddressProof =
      typeof addressProof === "string"
        ? JSON.parse(addressProof)
        : addressProof;
    const parsedBankDetails =
      typeof bankDetails === "string" ? JSON.parse(bankDetails) : bankDetails;
    const parsedTaxProof =
      typeof taxProof === "string" ? JSON.parse(taxProof) : taxProof;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    // Check if user exists and has doctor role
    const user = await User.findOne({ _id: userId, role: { $in: ["doctor"] } });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found or not a doctor",
      });
      return;
    }

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log("Files:", files);

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !gender ||
      !dob ||
      !address ||
      !parsedQualifications ||
      !parsedRegistration ||
      !parsedExperience ||
      !parsedBankDetails
    ) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Helper function to generate unique file name and S3 key
    const generateS3Key = (
      file: Express.Multer.File
    ): { key: string; fileName: string } => {
      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const fileName = `${path.basename(
        originalName,
        extension
      )}_${timestamp}${extension}`;
      const key = `uploads/${fileName}`;
      return { key, fileName };
    };

    // Upload degreeImages and map to qualifications
    const degreeImages = files["degreeImages"] || [];
    let degreeImageUrls: string[] = [];
    if (degreeImages.length > 0) {
      degreeImageUrls = await Promise.all(
        degreeImages.map(async (file) => {
          const { key, fileName } = generateS3Key(file);
          return await UploadImgToS3({
            key,
            fileBuffer: file.buffer,
            fileName,
          });
        })
      );
      parsedQualifications.forEach((qual: any, index: number) => {
        if (degreeImageUrls[index]) {
          qual.degreeImage = degreeImageUrls[index];
        }
      });
    }

    parsedQualifications.forEach((qual: any, index: number) => {
      qual.degreeImage = degreeImageUrls[index] || qual.degreeImage; // Preserve existing if no new image
    });

    // Upload licenseImages and map to registration
    const licenseImages = files["licenseImages"] || [];
    let licenseImageUrls: string[] = [];
    if (licenseImages.length > 0) {
      licenseImageUrls = await Promise.all(
        licenseImages.map(async (file) => {
          const { key, fileName } = generateS3Key(file);
          return await UploadImgToS3({
            key,
            fileBuffer: file.buffer,
            fileName,
          });
        })
      );
      parsedRegistration.forEach((reg: any, index: number) => {
        if (licenseImageUrls[index]) {
          reg.licenseImage = licenseImageUrls[index];
        }
      });
    }

    parsedRegistration.forEach((reg: any, index: number) => {
      reg.licenseImage = licenseImageUrls[index] || reg.licenseImage; // Preserve existing if no new image
    });

    // Upload single images
    const signatureImage = files["signatureImage"]?.[0];
    const signatureImageUrl = signatureImage
      ? await UploadImgToS3({
          key: generateS3Key(signatureImage).key,
          fileBuffer: signatureImage.buffer,
          fileName: generateS3Key(signatureImage).fileName,
        })
      : undefined;

    const taxImage = files["taxImage"]?.[0];
    const taxImageUrl = taxImage
      ? await UploadImgToS3({
          key: generateS3Key(taxImage).key,
          fileBuffer: taxImage.buffer,
          fileName: generateS3Key(taxImage).fileName,
        })
      : undefined;

    const upiQrImage = files["upiqrImage"]?.[0];
    const upiQrImageUrl = upiQrImage
      ? await UploadImgToS3({
          key: generateS3Key(upiQrImage).key,
          fileBuffer: upiQrImage.buffer,
          fileName: generateS3Key(upiQrImage).fileName,
        })
      : undefined;

    const profilePic = files["profilePic"]?.[0];
    const profilePicUrl = profilePic
      ? await UploadImgToS3({
          key: generateS3Key(profilePic).key,
          fileBuffer: profilePic.buffer,
          fileName: generateS3Key(profilePic).fileName,
        })
      : undefined;

    const personalIdProofImage = files["personalIdProofImage"]?.[0];
    const personalIdProofImageUrl = personalIdProofImage
      ? await UploadImgToS3({
          key: generateS3Key(personalIdProofImage).key,
          fileBuffer: personalIdProofImage.buffer,
          fileName: generateS3Key(personalIdProofImage).fileName,
        })
      : undefined;

    const addressProofImage = files["addressProofImage"]?.[0];
    const addressProofImageUrl = addressProofImage
      ? await UploadImgToS3({
          key: generateS3Key(addressProofImage).key,
          fileBuffer: addressProofImage.buffer,
          fileName: generateS3Key(addressProofImage).fileName,
        })
      : undefined;

    // Prepare update data
    const updateData = {
      prefix,
      firstName,
      lastName,
      profilePic: profilePicUrl,
      gender,
      dob: new Date(dob),
      address,
      personalIdProof: {
        ...parsedPersonalIdProof,
        image: personalIdProofImageUrl,
      },
      addressProof: {
        ...parsedAddressProof,
        image: addressProofImageUrl,
      },
      bankDetails: {
        ...parsedBankDetails,
        upiQrImage: upiQrImageUrl,
      },
      qualifications: parsedQualifications,
      registration: parsedRegistration,
      experience: parsedExperience,
      taxProof: {
        ...parsedTaxProof,
        image: taxImageUrl,
      },
      signatureImage: signatureImageUrl,
    };

    console.log(" main data to update", updateData);

    // Update doctor using discriminator model
    const updatedDoctor = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedDoctor) {
      console.log("Failed to update doctor information:", updatedDoctor);
      res.status(500).json({
        success: false,
        message: "Failed to update doctor information",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Doctor onboarded successfully",
      data: updatedDoctor,
    });
  } catch (error) {
    console.error("Error in doctor onboarding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to onboard doctor",
      error: (error as Error).message,
    });
  }
};

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const subscribeDoctor = async (
  req: MulterRequest,
  res: Response
): Promise<void> => {
  try {
    // Check for required form data
    if (!req.body.data || !req.file) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: JSON data and payment image are required",
      });
      return;
    }

    // Parse JSON data from form
    let formData;
    try {
      formData = JSON.parse(req.body.data);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Invalid JSON data format",
      });
      return;
    }

    const { subscriptionId, paymentDetails } = formData;
    const { doctorId } = req.params;

    if (!doctorId || !subscriptionId || !paymentDetails?.upiId) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: doctorId, subscriptionId, or paymentDetails.upiId",
      });
      return;
    }

    // Find doctor
    const doctor: any = await Doctor.findById(doctorId);
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find subscription
    const subscription = await DoctorSubscription.findById(subscriptionId);
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
      return;
    }

    if (!subscription.isActive) {
      res.status(400).json({
        success: false,
        message: "Subscription plan is not active",
      });
      return;
    }

    // Calculate end date based on subscription duration
    const startDate = new Date();
    let endDate: Date | undefined;

    switch (subscription.duration) {
      case "1 month":
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);
        break;
      case "3 months":
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 3);
        break;
      case "1 year":
        endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + 1);
        break;
      case "2 years":
        endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + 2);
        break;
      case "lifetime":
        endDate = undefined; // No end date for lifetime
        break;
      default:
        res.status(400).json({
          success: false,
          message: "Invalid subscription duration",
        });
        return;
    }

    // Handle payment image upload to S3
    const paymentImageKey = `doctors/subscriptions/payments/${Date.now()}-${req.file.originalname}`;
    const paymentImageUrl = await UploadImgToS3({
      key: paymentImageKey,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
    });

    // Create new subscription entry
    const newSubscription = {
      startDate: new Date(),
      endDate,
      paymentDetails: {
        upiId: paymentDetails.upiId,
        paymentImage: paymentImageUrl,
      },
      SubscriptionId: subscription._id,
    };

    // Add subscription to doctor's subscriptions array
    doctor.subscriptions.push(newSubscription);

    // Save the updated doctor document
    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Doctor subscribed successfully",
      data: newSubscription,
    });
  } catch (error) {
    console.error("Error in subscribing doctor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe doctor",
      error: (error as Error).message,
    });
  }
};
