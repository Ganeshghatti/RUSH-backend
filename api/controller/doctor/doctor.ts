import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Doctor from "../../models/user/doctor-model";
import DoctorSubscription from "../../models/subscription-model";
import { UploadImgToS3 } from "../../utils/aws_s3/upload-media";
import { generateSignedUrlsForDoctor } from "../../utils/signed-url";
import path from "path";
import { generateSignedUrlsForUser } from "../../utils/signed-url";
import OnlineAppointment from "../../models/appointment/online-appointment-model";

// Store timeout references for auto-disable functionality
const doctorTimeouts = new Map<string, NodeJS.Timeout>();

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
      specialization,
      taxProof
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
      typeof bankDetails === "string" ? JSON.parse(bankDetails) : bankDetails

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
    const user = await User.findOne({
      _id: userId,
      roles: { $in: ["doctor"] },
    });
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
      !parsedBankDetails ||
      !specialization
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
      const degreeImagePromises = degreeImages.map((file) => {
        const { key, fileName } = generateS3Key(file);
        return UploadImgToS3({
          key,
          fileBuffer: file.buffer,
          fileName,
        });
      });
      degreeImageUrls = await Promise.all(degreeImagePromises);
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
      const licenseImagePromises = licenseImages.map((file) => {
        const { key, fileName } = generateS3Key(file);
        return UploadImgToS3({
          key,
          fileBuffer: file.buffer,
          fileName,
        });
      });
      licenseImageUrls = await Promise.all(licenseImagePromises);
      parsedRegistration.forEach((reg: any, index: number) => {
        if (licenseImageUrls[index]) {
          reg.licenseImage = licenseImageUrls[index];
        }
      });
    }

    parsedRegistration.forEach((reg: any, index: number) => {
      reg.licenseImage = licenseImageUrls[index] || reg.licenseImage; // Preserve existing if no new image
    });

    // Prepare all single image uploads in parallel
    const singleImageUploads = [];
    const singleImageKeys = [];

    if (files["signatureImage"]?.[0]) {
      const { key, fileName } = generateS3Key(files["signatureImage"][0]);
      singleImageUploads.push(
        UploadImgToS3({
          key,
          fileBuffer: files["signatureImage"][0].buffer,
          fileName,
        })
      );
      singleImageKeys.push("signatureImage");
    }

    if (files["upiqrImage"]?.[0]) {
      const { key, fileName } = generateS3Key(files["upiqrImage"][0]);
      singleImageUploads.push(
        UploadImgToS3({
          key,
          fileBuffer: files["upiqrImage"][0].buffer,
          fileName,
        })
      );
      singleImageKeys.push("upiqrImage");
    }

    if (files["profilePic"]?.[0]) {
      const { key, fileName } = generateS3Key(files["profilePic"][0]);
      singleImageUploads.push(
        UploadImgToS3({
          key,
          fileBuffer: files["profilePic"][0].buffer,
          fileName,
        })
      );
      singleImageKeys.push("profilePic");
    }

    if (files["personalIdProofImage"]?.[0]) {
      const { key, fileName } = generateS3Key(files["personalIdProofImage"][0]);
      singleImageUploads.push(
        UploadImgToS3({
          key,
          fileBuffer: files["personalIdProofImage"][0].buffer,
          fileName,
        })
      );
      singleImageKeys.push("personalIdProofImage");
    }

    if (files["addressProofImage"]?.[0]) {
      const { key, fileName } = generateS3Key(files["addressProofImage"][0]);
      singleImageUploads.push(
        UploadImgToS3({
          key,
          fileBuffer: files["addressProofImage"][0].buffer,
          fileName,
        })
      );
      singleImageKeys.push("addressProofImage");
    }

    if (files["taxImage"]?.[0]) {
      const { key, fileName } = generateS3Key(files["taxImage"][0]);
      singleImageUploads.push(
        UploadImgToS3({
          key,
          fileBuffer: files["taxImage"][0].buffer,
          fileName,
        })
      );
      singleImageKeys.push("taxImage");
    }

    // Upload all single images in parallel
    const singleImageUrls = await Promise.all(singleImageUploads);

    // Map the results to their respective variables
    const signatureImageUrl = singleImageKeys.indexOf("signatureImage") !== -1 
      ? singleImageUrls[singleImageKeys.indexOf("signatureImage")] 
      : undefined;
    const upiQrImageUrl = singleImageKeys.indexOf("upiqrImage") !== -1 
      ? singleImageUrls[singleImageKeys.indexOf("upiqrImage")] 
      : undefined;
    const profilePicUrl = singleImageKeys.indexOf("profilePic") !== -1 
      ? singleImageUrls[singleImageKeys.indexOf("profilePic")] 
      : undefined;
    const personalIdProofImageUrl = singleImageKeys.indexOf("personalIdProofImage") !== -1 
      ? singleImageUrls[singleImageKeys.indexOf("personalIdProofImage")] 
      : undefined;
    const addressProofImageUrl = singleImageKeys.indexOf("addressProofImage") !== -1 
      ? singleImageUrls[singleImageKeys.indexOf("addressProofImage")] 
      : undefined;
    const taxProofImageUrl = singleImageKeys.indexOf("taxImage") !== -1 
      ? singleImageUrls[singleImageKeys.indexOf("taxImage")] 
      : undefined;

    // Prepare update data for doctor
    const doctorUpdateData = {
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
      signatureImage: signatureImageUrl,
      specialization,
      status: "pending",
    };

    // Prepare update data for user
    const userUpdateData = {
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
      taxProof: parsedTaxProof ? {
        ...parsedTaxProof,
        image: taxProofImageUrl,
      } : undefined
    };

    console.log(" main data to update", doctorUpdateData);

    // Update both user and doctor using discriminator model
    const [updatedUser, updatedDoctor] = await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { $set: userUpdateData },
        {
          new: true,
          runValidators: true,
        }
      ),
      Doctor.findOneAndUpdate(
        { userId },
        { $set: doctorUpdateData },
        {
          new: true,
          runValidators: true,
        }
      )
    ]);

    if (!updatedDoctor || !updatedUser) {
      console.log("the error is here", updatedDoctor, updatedUser)
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
        message:
          "Missing required fields: JSON data and payment image are required",
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
        message:
          "Missing required fields: doctorId, subscriptionId, or paymentDetails.upiId",
      });
      return;
    }

    // Find doctor
    const doctor: any = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    console.log("doctor", doctor);

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
    const paymentImageKey = `doctors/subscriptions/payments/${Date.now()}-${
      req.file.originalname
    }`;
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

    console.log("newSubscription", newSubscription);

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

export const getDoctorById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      res.status(400).json({
        success: false,
        message: "userId is required",
      });
      return;
    }

    // Find user and populate doctor data
    const user = await User.findOne({ _id: userId })
      .populate({
        path: 'roleRefs.doctor',
        select: '-password'
      });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (!user.roles.includes("doctor")) {
      res.status(403).json({
        success: false,
        message: "User is not a doctor",
      });
      return;
    }

    if (!user?.roleRefs?.doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor data not found",
      });
      return;
    }

    // Generate signed URLs for both user and doctor data
    const userWithUrls = await generateSignedUrlsForUser(user);

    res.status(200).json({
      success: true,
      message: "Doctor fetched successfully",
      data: userWithUrls,
    });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch doctor",
      error: (error as Error).message,
    });
  }
};

export const getAllPatientsForDoctor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user.id; // Get doctor's user ID from auth middleware

    // Find the doctor document using userId
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Find all appointments for this doctor and get unique patients
    const appointments = await OnlineAppointment.find({ 
      doctorId: doctor._id 
    })
    .populate({
      path: "patientId",
      select: "firstName lastName countryCode phone gender email profilePic dob address",
    })
    .sort({ "slot.day": -1 }); // Sort by most recent appointments first

    if (!appointments || appointments.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
        message: "No patients found for this doctor",
      });
      return;
    }

    // Extract unique patients from appointments
    const uniquePatients = new Map();
    
    appointments.forEach((appointment: any) => {
      if (appointment.patientId && !uniquePatients.has(appointment.patientId._id.toString())) {
        uniquePatients.set(appointment.patientId._id.toString(), {
          ...appointment.patientId.toObject(),
          lastAppointmentDate: appointment.slot.day,
          totalAppointments: 1
        });
      } else if (appointment.patientId && uniquePatients.has(appointment.patientId._id.toString())) {
        // Update appointment count for existing patient
        const existingPatient = uniquePatients.get(appointment.patientId._id.toString());
        existingPatient.totalAppointments += 1;
        
        // Update last appointment date if this one is more recent
        if (new Date(appointment.slot.day) > new Date(existingPatient.lastAppointmentDate)) {
          existingPatient.lastAppointmentDate = appointment.slot.day;
        }
      }
    });

    // Convert Map to Array and generate signed URLs if needed
    const patientsArray = Array.from(uniquePatients.values());

    // Generate signed URLs for profile pictures if they exist
    const patientsWithSignedUrls = await Promise.all(
      patientsArray.map(async (patient) => {
        if (patient.profilePic) {
          try {
            const signedUrls = await generateSignedUrlsForUser(patient);
            return signedUrls;
          } catch (error) {
            console.warn("Failed to generate signed URL for patient profile pic:", error);
            return patient;
          }
        }
        return patient;
      })
    );

    res.status(200).json({
      success: true,
      data: patientsWithSignedUrls,
      count: patientsWithSignedUrls.length,
      message: "Patients retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting patients for doctor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patients",
      error: (error as Error).message,
    });
  }
};

export const getDoctorAppointmentStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user.id; // Get doctor's user ID from auth middleware

    // Find the doctor document using userId
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Get all appointments for this doctor with populated patient data
    const appointments = await OnlineAppointment.find({ 
      doctorId: doctor._id 
    })
    .populate({
      path: "patientId",
      select: "firstName lastName countryCode phone gender email profilePic dob address",
    })
    .sort({ "slot.day": -1, "slot.time.start": -1 }); // Sort by most recent first

    // Calculate counts by status
    const pendingCount = appointments.filter(app => app.status === "pending").length;
    const acceptedCount = appointments.filter(app => app.status === "accepted").length;
    const rejectedCount = appointments.filter(app => app.status === "rejected").length;
    const totalCount = appointments.length;

    // Generate signed URLs for patient profile pictures
    const appointmentsWithSignedUrls = await Promise.all(
      appointments.map(async (appointment: any) => {
        let patientWithUrls = appointment.patientId;
        
        if (appointment.patientId && appointment.patientId.profilePic) {
          try {
            patientWithUrls = await generateSignedUrlsForUser(appointment.patientId);
          } catch (error) {
            console.warn("Failed to generate signed URL for patient profile pic:", error);
          }
        }

        return {
          _id: appointment._id,
          patientInfo: patientWithUrls,
          slot: appointment.slot,
          history: appointment.history,
          status: appointment.status,
          roomName: appointment.roomName,
        };
      })
    );

    // Prepare the response data
    const stats = {
      counts: {
        total: totalCount,
        pending: pendingCount,
        accepted: acceptedCount,
        rejected: rejectedCount
      },
      appointments: appointmentsWithSignedUrls
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: "Doctor appointment statistics retrieved successfully",
    });
  } catch (error: any) {
    console.error("Error getting doctor appointment stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointment statistics",
      error: error.message,
    });
  }
};

export const getDoctorDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const doctorId = req.user.id; // Get doctor's user ID from auth middleware

    // Find the doctor document using userId
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Get all appointments for this doctor
    const appointments = await OnlineAppointment.find({ 
      doctorId: doctor._id 
    })
    .populate({
      path: "patientId",
      select: "firstName lastName profilePic",
    })
    .sort({ "slot.day": -1, "slot.time.start": -1 }); // Sort by most recent first

    // Calculate appointment counts by status
    const totalAppointments = appointments.length;
    const pendingAppointments = appointments.filter(app => app.status === "pending").length;
    const acceptedAppointments = appointments.filter(app => app.status === "accepted").length;
    const rejectedAppointments = appointments.filter(app => app.status === "rejected").length;

    // Get unique patient count
    const uniquePatientIds = new Set();
    appointments.forEach(appointment => {
      if (appointment.patientId) {
        uniquePatientIds.add(appointment.patientId._id.toString());
      }
    });
    const totalPatients = uniquePatientIds.size;

    // Prepare dashboard data
    const dashboardData = {
      appointmentStats: {
        total: totalAppointments,
        pending: pendingAppointments,
        accepted: acceptedAppointments,
        rejected: rejectedAppointments,
      },
      patientStats: {
        totalPatients: totalPatients,
      },
      reviews: {
        total: 0, // Set to 0 as requested
        average: 0,
      },
    };

    res.status(200).json({
      success: true,
      message: "Doctor dashboard data retrieved successfully",
      data: dashboardData,
    });
  } catch (error: any) {
    console.error("Error getting doctor dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get dashboard data",
      error: error.message,
    });
  }
};

export const updateDoctorActiveStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorId = req.user.id; // Get doctor's user ID from auth middleware
    const { isActive } = req.body;

    // Validate input
    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be a boolean value (true or false)",
      });
      return;
    }

    // Find the doctor document using userId
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
      return;
    }

    // Clear any existing timeout for this doctor
    const existingTimeout = doctorTimeouts.get(doctorId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      doctorTimeouts.delete(doctorId);
    }

    // Update the doctor document
    const updatedDoctor = await Doctor.findOneAndUpdate(
      { userId: doctorId },
      { $set: { isActive: isActive } },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedDoctor) {
      res.status(500).json({
        success: false,
        message: "Failed to update doctor status",
      });
      return;
    }

    // If setting to active, schedule auto-disable after 1 hour
    if (isActive === true) {
      const timeoutId = setTimeout(async () => {
        try {
          await Doctor.findOneAndUpdate(
            { userId: doctorId },
            { $set: { isActive: false } },
            { new: true }
          );
          console.log(`Doctor ${doctorId} automatically set to inactive after 1 hour`);
          doctorTimeouts.delete(doctorId);
        } catch (error) {
          console.error(`Failed to auto-disable doctor ${doctorId}:`, error);
        }
             }, 60 * 60 * 1000); // 1 hour in milliseconds

      // Store the timeout reference
      doctorTimeouts.set(doctorId, timeoutId);
    }

    res.status(200).json({
      success: true,
      message: `Doctor status updated to ${isActive ? "active" : "inactive"}${isActive ? ". Will automatically disable after 1 hour." : ""}`,
      data: {
        isActive: updatedDoctor.isActive,
      },
    });
  } catch (error: any) {
    console.error("Error updating doctor active status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update doctor active status",
      error: error.message,
    });
  }
};