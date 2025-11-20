import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Doctor from "../../models/user/doctor-model";
import DoctorSubscription from "../../models/doctor-subscription";
import { UploadImgToS3, GetSignedUrl } from "../../utils/aws_s3/upload-media";
import { generateSignedUrlsForDoctor } from "../../utils/signed-url";
import path from "path";
import { generateSignedUrlsForUser } from "../../utils/signed-url";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import HomeVisitAppointment from "../../models/appointment/homevisit-appointment-model";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import crypto from "crypto";
import Razorpay from "razorpay";
import { razorpayConfig } from "../../config/razorpay";
import { RatingModel } from "../../models/appointment/rating-model";

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
        message: "Please include the required form data.",
        action: "doctorOnboardV2:missing-data",
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
        message: "The user ID provided is invalid.",
        action: "doctorOnboardV2:invalid-user-id",
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
        message:
          "We couldn't find the user or they are not registered as a doctor.",
        action: "doctorOnboardV2:user-not-found",
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
        message: "Please fill in all required doctor details.",
        action: "doctorOnboardV2:missing-required-fields",
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
    const signatureImageUrl =
      singleImageKeys.indexOf("signatureImage") !== -1
        ? singleImageUrls[singleImageKeys.indexOf("signatureImage")]
        : undefined;
    const upiQrImageUrl =
      singleImageKeys.indexOf("upiqrImage") !== -1
        ? singleImageUrls[singleImageKeys.indexOf("upiqrImage")]
        : undefined;
    const profilePicUrl =
      singleImageKeys.indexOf("profilePic") !== -1
        ? singleImageUrls[singleImageKeys.indexOf("profilePic")]
        : undefined;
    const personalIdProofImageUrl =
      singleImageKeys.indexOf("personalIdProofImage") !== -1
        ? singleImageUrls[singleImageKeys.indexOf("personalIdProofImage")]
        : undefined;
    const addressProofImageUrl =
      singleImageKeys.indexOf("addressProofImage") !== -1
        ? singleImageUrls[singleImageKeys.indexOf("addressProofImage")]
        : undefined;
    const taxProofImageUrl =
      singleImageKeys.indexOf("taxImage") !== -1
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
      taxProof: parsedTaxProof
        ? {
            ...parsedTaxProof,
            image: taxProofImageUrl,
          }
        : undefined,
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
      ),
    ]);

    if (!updatedDoctor || !updatedUser) {
      console.log("the error is here", updatedDoctor, updatedUser);
      res.status(500).json({
        success: false,
        message: "We couldn't save the doctor information.",
        action: "doctorOnboardV2:update-failed",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Doctor information saved successfully.",
      action: "doctorOnboardV2:success",
      data: updatedDoctor,
    });
  } catch (error) {
    console.error("Error in doctor onboarding:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't complete the doctor onboarding.",
      action: (error as Error).message,
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
    if (!req.body.data) {
      res.status(400).json({
        success: false,
        message: "Please include the required form data.",
        action: "subscribeDoctor:missing-data",
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
        message: "We couldn't read the submitted information.",
        action: "subscribeDoctor:invalid-json",
      });
      return;
    }

    const { subscriptionId } = formData;
    const { doctorId } = req.params;

    if (!doctorId || !subscriptionId) {
      res.status(400).json({
        success: false,
        message:
          "Missing required details. Please provide the doctor and subscription IDs.",
        action: "subscribeDoctor:missing-fields",
      });
      return;
    }

    // Find doctor
    const doctor: any = await Doctor.findOne({ userId: doctorId }).populate({
      path: "userId",
      select: "firstName lastName email phone countryCode",
    });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find the doctor for this subscription.",
        action: "subscribeDoctor:doctor-not-found",
      });
      return;
    }

    console.log("doctor on subscribe: ", doctor);

    // Find subscription
    const subscription = await DoctorSubscription.findById(subscriptionId);
    if (!subscription) {
      res.status(404).json({
        success: false,
        message: "We couldn't find that subscription plan.",
        action: "subscribeDoctor:plan-not-found",
      });
      return;
    }

    if (!subscription.isActive) {
      res.status(400).json({
        success: false,
        message: "This subscription plan is currently inactive.",
        action: "subscribeDoctor:plan-inactive",
      });
      return;
    }

    console.log("subscription active:", subscription);

    // convert to amount to integer
    const options = {
      amount: Math.round(subscription.price * 100),
      currency: "INR",
      receipt: "receipt_" + Math.random().toString(36).substring(7),
    };

    const order = await razorpayConfig.orders.create(options);

    console.log("order created: ", order);

    res.status(200).json({
      success: true,
      message: "Subscription order created successfully.",
      action: "subscribeDoctor:order-created",
      data: {
        order,
        prefill: {
          name: doctor.userId.firstName + " " + doctor.userId.lastName,
          email: doctor.userId.email,
          contact: doctor.userId.phone,
          countryCode: doctor.userId.countryCode || "+91",
        },
      },
    });
  } catch (error) {
    console.error("Error in subscribing doctor:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't start the subscription.",
      action: error instanceof Error ? error.message : String(error),
    });
  }
};

export const verifyPaymentSubscription = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscriptionId,
    } = req.body;

    const userId = req.user.id;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !subscriptionId ||
      !userId
    ) {
      res.status(400).json({
        success: false,
        message: "Please provide all payment verification details.",
        action: "doctorVerifyPaymentSubscription:validate-input",
      });
      return;
    }
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZ_KEY_SECRET || "")
      .update(sign.toString())
      .digest("hex");
    if (razorpay_signature === expectedSign) {
      // Payment is verified
      const doctor: any = await Doctor.findOne({ userId: userId });

      if (!doctor) {
        res.status(404).json({
          success: false,
          message: "We couldn't find the doctor for this subscription.",
          action: "doctorVerifyPaymentSubscription:doctor-not-found",
        });
        return;
      }

      const subscription = await DoctorSubscription.findById(subscriptionId);
      if (!subscription) {
        res.status(404).json({
          success: false,
          message: "We couldn't find that subscription plan.",
          action: "doctorVerifyPaymentSubscription:plan-not-found",
        });
        return;
      }

      if (!subscription.isActive) {
        res.status(400).json({
          success: false,
          message: "This subscription plan is currently inactive.",
          action: "doctorVerifyPaymentSubscription:plan-inactive",
        });
        return;
      }

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
          endDate.setMonth(startDate.getMonth() + 24);
          break;
        case "3 years":
          endDate = new Date(startDate);
          endDate.setMonth(startDate.getMonth() + 36);
          break;
        case "20 years":
          endDate = new Date(startDate);
          endDate.setFullYear(startDate.getFullYear() + 20);
          break;
        case "15 years":
          endDate = new Date(startDate);
          endDate.setFullYear(startDate.getFullYear() + 15);
          break;
        case "10 years":
          endDate = new Date(startDate);
          endDate.setFullYear(startDate.getFullYear() + 10);
          break;
        case "5 years":
          endDate = new Date(startDate);
          endDate.setFullYear(startDate.getFullYear() + 5);
          break;
        case "40 years":
          endDate = new Date(startDate);
          endDate.setFullYear(startDate.getFullYear() + 40);
          break;
        case "lifetime":
          endDate = undefined; // No end date for lifetime
          break;
        default:
          res.status(400).json({
            success: false,
            message: "This subscription duration is not supported.",
            action: `doctorVerifyPaymentSubscription:invalid-duration:${subscription.duration}`,
          });
          return;
      }

      const newSubscription = {
        startDate: new Date(),
        endDate,
        razorpay_order_id,
        razorpay_payment_id,
        SubscriptionId: subscription._id,
        amount_paid: subscription.price,
      };

      doctor.subscriptions.push(newSubscription);

      await doctor.save();

      res.status(200).json({
        success: true,
        message: "Subscription payment verified successfully.",
        action: "doctorVerifyPaymentSubscription:success",
        data: doctor,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "We could not verify the payment signature.",
        action: "doctorVerifyPaymentSubscription:signature-mismatch",
      });
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "We couldn't verify the subscription payment.",
      action: (err as Error).message,
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
        message: "User ID is required.",
        action: "getDoctorById:missing-user-id",
      });
      return;
    }

    // Find user and populate doctor data
    const user = await User.findOne({ _id: userId }).populate({
      path: "roleRefs.doctor",
      select: "-password",
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "We couldn't find a user with that ID.",
        action: "getDoctorById:user-not-found",
      });
      return;
    }

    if (!user.roles.includes("doctor")) {
      res.status(403).json({
        success: false,
        message: "This user is not registered as a doctor.",
        action: "getDoctorById:not-a-doctor",
      });
      return;
    }

    if (!user?.roleRefs?.doctor) {
      res.status(404).json({
        success: false,
        message: "No doctor profile found for this user.",
        action: "getDoctorById:doctor-data-not-found",
      });
      return;
    }

    // Generate signed URLs for both user and doctor data
    const userWithUrls = await generateSignedUrlsForUser(user);

    res.status(200).json({
      success: true,
      message: "Doctor details fetched successfully.",
      action: "getDoctorById:success",
      data: userWithUrls,
    });
  } catch (error) {
    console.error("Error fetching doctor:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't fetch the doctor details.",
      action: (error as Error).message,
    });
  }
};

export const getAllPatientsForDoctor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const doctorUserId = req.user.id;

    // Find the doctor document using userId
    const doctor = await Doctor.findOne({ userId: doctorUserId });
    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor's user profile.",
        action: "getAllPatientsForDoctor:doctorUser-not-found",
      });
      return;
    }

    // Find all appointments for this doctor and get unique patients
    const appointments = await OnlineAppointment.find({
      doctorId: doctor._id,
    })
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select:
            "firstName lastName countryCode phone gender email profilePic dob address",
        },
      })
      .sort({ "slot.day": -1 });

    if (!appointments || appointments.length === 0) {
      res.status(200).json({
        success: true,
        message: "No patients found for this doctor yet.",
        action: "getAllPatientsForDoctor:empty",
        data: [],
      });
      return;
    }

    // Extract unique patients from appointments
    const uniquePatients = new Map();

    appointments.forEach((appointment: any) => {
      if (
        appointment.patientId &&
        !uniquePatients.has(appointment.patientId._id.toString())
      ) {
        uniquePatients.set(appointment.patientId._id.toString(), {
          ...appointment.patientId.toObject(),
          lastAppointmentDate: appointment.slot.day,
          totalAppointments: 1,
        });
      } else if (
        appointment.patientId &&
        uniquePatients.has(appointment.patientId._id.toString())
      ) {
        // Update appointment count for existing patient
        const existingPatient = uniquePatients.get(
          appointment.patientId._id.toString()
        );
        existingPatient.totalAppointments += 1;

        // Update last appointment date if this one is more recent
        if (
          new Date(appointment.slot.day) >
          new Date(existingPatient.lastAppointmentDate)
        ) {
          existingPatient.lastAppointmentDate = appointment.slot.day;
        }
      }
    });

    // Convert Map to Array and generate signed URLs if needed
    const patientsArray = Array.from(uniquePatients.values());
    // Generate signed URLs for profile pictures if they exist
    const patientsWithSignedUrls = await Promise.all(
      patientsArray.map(async (patient) => {
        if (patient.userId.profilePic) {
          try {
            const signedUrls = await generateSignedUrlsForUser(patient.userId);
            return {
              ...patient,
              userId: signedUrls,
            };
          } catch (error) {
            console.warn(
              "Failed to generate signed URL for patient profile pic:",
              error
            );
            return patient;
          }
        }
        return patient;
      })
    );

    res.status(200).json({
      success: true,
      message: "Patients retrieved successfully.",
      action: "getAllPatientsForDoctor:success",
      data: {
        patients: patientsWithSignedUrls,
        count: patientsWithSignedUrls.length,
      },
    });
  } catch (error) {
    console.error("Error getting patients for doctor:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load patients for this doctor.",
      action: (error as Error).message,
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
        message: "We couldn't find your doctor profile.",
        action: "getDoctorAppointmentStats:doctor-not-found",
      });
      return;
    }

    // Get all online appointments for this doctor with populated patient data
    const onlineAppointments = await OnlineAppointment.find({
      doctorId: doctor._id,
    })
      .populate({
        path: "patientId",
        select:
          "firstName lastName countryCode phone gender email profilePic dob address",
      })
      .sort({ "slot.day": -1, "slot.time.start": -1 }); // Sort by most recent first

    // Get all clinic appointments for this doctor with populated patient data
    const clinicAppointments = await ClinicAppointment.find({
      doctorId: doctor._id,
    })
      .populate({
        path: "patientId",
        select:
          "firstName lastName countryCode phone gender email profilePic dob address",
      })
      .sort({ "slot.day": -1, "slot.time.start": -1 }); // Sort by most recent first

    // Add appointment type to online appointments
    const onlineAppointmentsWithType = onlineAppointments.map(
      (appointment) => ({
        ...appointment.toObject(),
        appointmentType: "online",
      })
    );

    // Add clinic details and appointment type to clinic appointments
    const clinicAppointmentsWithType = clinicAppointments.map((appointment) => {
      const appointmentObj = appointment.toObject();
      const clinicVisit = doctor.clinicVisit as any;
      const clinic = (clinicVisit?.clinics || []).find(
        (c: any) => c._id.toString() === appointment.clinicId
      );

      return {
        ...appointmentObj,
        appointmentType: "clinic",
        clinicDetails: clinic
          ? {
              clinicName: clinic.clinicName,
              address: clinic.address,
              consultationFee: clinic.consultationFee,
              frontDeskNumber: clinic.frontDeskNumber,
              operationalDays: clinic.operationalDays,
              timeSlots: clinic.timeSlots,
              isActive: clinic.isActive,
            }
          : null,
      };
    });

    // Combine all appointments
    const allAppointments = [
      ...onlineAppointmentsWithType,
      ...clinicAppointmentsWithType,
    ];

    // Calculate counts by status for all appointments
    const pendingCount = allAppointments.filter(
      (app) => app.status === "pending"
    ).length;
    const acceptedConfirmedCount = allAppointments.filter(
      (app) => app.status === "accepted"
    ).length;
    const rejectedCancelledCount = allAppointments.filter(
      (app) => app.status === "rejected"
    ).length;
    const completedCount = allAppointments.filter(
      (app) => app.status === "completed"
    ).length;
    const totalCount = allAppointments.length;

    // Generate signed URLs for patient profile pictures
    const appointmentsWithSignedUrls = await Promise.all(
      allAppointments.map(async (appointment: any) => {
        let patientWithUrls = appointment.patientId;

        if (appointment.patientId && appointment.patientId.profilePic) {
          try {
            patientWithUrls = await generateSignedUrlsForUser(
              appointment.patientId
            );
          } catch (error) {
            console.warn(
              "Failed to generate signed URL for patient profile pic:",
              error
            );
          }
        }

        return {
          _id: appointment._id,
          patientInfo: patientWithUrls,
          slot: appointment.slot,
          history: appointment.history,
          status: appointment.status,
          appointmentType: appointment.appointmentType,
          roomName: appointment.roomName,
          clinicDetails: appointment.clinicDetails || null,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt,
        };
      })
    );

    // Sort by creation date (most recent first)
    appointmentsWithSignedUrls.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Prepare the response data
    const stats = {
      counts: {
        total: totalCount,
        pending: pendingCount,
        acceptedConfirmed: acceptedConfirmedCount,
        rejectedCancelled: rejectedCancelledCount,
        completed: completedCount,
      },
      appointments: appointmentsWithSignedUrls,
    };

    res.status(200).json({
      success: true,
      message: "Doctor appointment statistics retrieved successfully.",
      action: "getDoctorAppointmentStats:success",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting doctor appointment stats:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load appointment statistics.",
      action: error.message,
    });
  }
};

export const getDoctorDashboard = async (
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
        message: "We couldn't find your doctor profile.",
        action: "getDoctorDashboard:doctor-not-found",
      });
      return;
    }

    const noOfRating = await RatingModel.countDocuments({
      doctorId: doctor._id,
    });

    // Get all appointments for this doctor
    const [
      onlineAppointments,
      emergencyAppointments,
      clinicAppointments,
      homeVisitAppointments,
    ] = await Promise.all([
      OnlineAppointment.find({
        doctorId: doctor._id,
      })
        .populate({
          path: "patientId",
          select: "userId",
          populate: {
            path: "userId",
            select: "firstName lastName countryCode gender email profilePic",
          },
        })
        .sort({ "slot.day": -1, "slot.time.start": -1 }),
      EmergencyAppointment.find({
        doctorId: doctor._id,
      })
        .populate({
          path: "patientId",
          select: "userId",
          populate: {
            path: "userId",
            select: "firstName lastName countryCode phone email profilePic",
          },
        })
        .sort({ createdAt: -1 }),
      ClinicAppointment.find({
        doctorId: doctor._id,
      })
        .populate({
          path: "patientId",
          select: "userId",
          populate: {
            path: "userId",
            select: "firstName lastName countryCode gender email profilePic",
          },
        })
        .sort({ "slot.day": -1, "slot.time.start": -1 }),
      HomeVisitAppointment.find({
        doctorId: doctor._id,
      })
        .populate({
          path: "patientId",
          select: "userId",
          populate: {
            path: "userId",
            select: "firstName lastName countryCode gender email profilePic",
          },
        })
        .sort({ "slot.day": -1, "slot.time.start": -1 }),
    ]);

    // Calculate online appointment counts by status
    const onlineStats = {
      total: onlineAppointments.length,
      pending: onlineAppointments.filter((app) => app.status === "pending")
        .length,
      accepted: onlineAppointments.filter((app) => app.status === "accepted")
        .length,
      completed: onlineAppointments.filter((app) => app.status === "completed")
        .length,
    };
    // Calculate emergency appointment counts by status
    const emergencyStats = {
      total: emergencyAppointments.length,
      pending: emergencyAppointments.filter((app) => app.status === "pending")
        .length,
      inProgress: emergencyAppointments.filter(
        (app) => app.status === "in-progress"
      ).length,
      completed: emergencyAppointments.filter(
        (app) => app.status === "completed"
      ).length,
    };
    const clinicStats = {
      total: clinicAppointments.length,
      pending: clinicAppointments.filter((app) => app.status === "pending")
        .length,
      accepted: clinicAppointments.filter((app) => app.status === "accepted")
        .length,
      completed: clinicAppointments.filter((app) => app.status === "completed")
        .length,
    };
    const homeVisitStats = {
      total: homeVisitAppointments.length,
      pending: homeVisitAppointments.filter(
        (app) => app.status === "pending" || app.status === "doctor_accepted"
      ).length,
      accepted: homeVisitAppointments.filter(
        (app) => app.status === "patient_confirmed"
      ).length,
      completed: homeVisitAppointments.filter(
        (app) => app.status === "completed"
      ).length,
    };

    // Calculate total appointments across both types
    const totalStats = {
      total:
        onlineStats.total +
        emergencyStats.total +
        clinicStats.total +
        homeVisitStats.total,
      pending:
        onlineStats.pending +
        emergencyStats.pending +
        clinicStats.pending +
        homeVisitStats.pending,
      active:
        onlineStats.accepted +
        emergencyStats.inProgress +
        clinicStats.accepted +
        homeVisitStats.accepted,
      completed:
        onlineStats.completed +
        emergencyStats.completed +
        clinicStats.completed +
        homeVisitStats.completed,
    };

    // Process emergency appointments to add presigned URLs
    const processedEmergencyAppointments = await Promise.all(
      emergencyAppointments
        .filter((appointment) => appointment.status !== "completed")
        .map(async (appointment) => {
          const appointmentObj = appointment.toObject() as any;

          // Generate presigned URLs for media array if it exists
          if (Array.isArray(appointmentObj.media)) {
            appointmentObj.media = await Promise.all(
              appointmentObj.media.map(async (mediaKey: any) => {
                if (
                  mediaKey &&
                  typeof mediaKey === "string" &&
                  mediaKey.trim() !== ""
                ) {
                  try {
                    return await GetSignedUrl(mediaKey);
                  } catch (error) {
                    console.warn(
                      "Could not generate signed URL for media:",
                      mediaKey,
                      error
                    );
                    return mediaKey;
                  }
                }
                return mediaKey;
              })
            );
          }

          // Generate presigned URL for patient's profile picture if it exists
          if (appointmentObj.patientId?.userId?.profilePic) {
            try {
              appointmentObj.patientId.userId.profilePic = await GetSignedUrl(
                appointmentObj.patientId.userId.profilePic
              );
            } catch (error) {
              console.warn(
                "Could not generate signed URL for profile picture:",
                appointmentObj.patientId.userId.profilePic,
                error
              );
            }
          }

          return appointmentObj;
        })
    );

    // Prepare dashboard data
    const dashboardData = {
      appointmentStats: totalStats,
      reviews: {
        total: noOfRating,
        average: 0,
      },
      // recentOnlineAppointments: onlineAppointments.slice(0, 5), // Get 5 most recent appointments
      recentEmergencyAppointments: processedEmergencyAppointments.slice(0, 5),
    };

    res.status(200).json({
      success: true,
      message: "Doctor dashboard data retrieved successfully.",
      action: "getDoctorDashboard:success",
      data: dashboardData,
    });
  } catch (error: any) {
    console.error("Error getting doctor dashboard:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't load the doctor dashboard.",
      action: error.message,
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
        message: "isActive must be true or false.",
        action: "updateDoctorActiveStatus:invalid-isActive",
      });
      return;
    }

    // Find the doctor document using userId
    const doctor = await Doctor.findOne({ userId: doctorId });

    if (!doctor) {
      res.status(404).json({
        success: false,
        message: "We couldn't find your doctor profile.",
        action: "updateDoctorActiveStatus:doctor-not-found",
      });
      return;
    }

    // Clear any existing timeout for this doctor
    const existingTimeout = doctorTimeouts.get(doctorId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      doctorTimeouts.delete(doctorId);
    }

    // Get current time
    const activationTime = new Date();

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
        message: "We couldn't update the doctor status.",
        action: "updateDoctorActiveStatus:update-failed",
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
          console.log(
            `Doctor ${doctorId} automatically set to inactive after 1 hour`
          );
          doctorTimeouts.delete(doctorId);
        } catch (error) {
          console.error(`Failed to auto-disable doctor ${doctorId}:`, error);
        }
      }, 2 * 60 * 1000); // 2 minutes in milliseconds

      // Store the timeout reference
      doctorTimeouts.set(doctorId, timeoutId);
    }

    res.status(200).json({
      success: true,
      message: `Doctor status updated to ${isActive ? "active" : "inactive"}${
        isActive
          ? ". The system will automatically set it to inactive soon."
          : ""
      }`,
      action: "updateDoctorActiveStatus:success",
      data: {
        isActive: updatedDoctor.isActive,
        activationTime: isActive ? activationTime : null,
        deactivationTime: isActive
          ? new Date(activationTime.getTime() + 2 * 60 * 1000)
          : null, // 2 minutes from activation
      },
    });
  } catch (error: any) {
    console.error("Error updating doctor active status:", error);
    res.status(500).json({
      success: false,
      message: "We couldn't update the doctor active status.",
      action: error.message,
    });
  }
};
