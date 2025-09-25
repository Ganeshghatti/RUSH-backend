import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../../models/user/user-model";
import Patient from "../../models/user/patient-model";
import Doctor from "../../models/user/doctor-model";
import OnlineAppointment from "../../models/appointment/online-appointment-model";
import ClinicAppointment from "../../models/appointment/clinic-appointment-model";
import PatientSubscription from "../../models/patient-subscription";
import { razorpayConfig } from "../../config/razorpay";
import {
  generateSignedUrlsForDoctor,
  generateSignedUrlsForUser,
} from "../../utils/signed-url";
import EmergencyAppointment from "../../models/appointment/emergency-appointment-model";
import { convertMediaKeysToUrls } from "../appointment/emergency-appointment";
import {
  addHealthMetricsSchema,
  updateHealthMetricsSchema,
} from "../../validation/validation";
import { HealthMetrics } from "../../models/health-metrics-model";
import { updateProfileSchema } from "../../validation/validation";
import crypto from "crypto";

export const subscribePatient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for required form data
    if (!req.body.data) {
      res.status(400).json({
        success: false,
        message:
          "Missing required fields: JSON data is required",
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

    const { subscriptionId } = formData;
    const { patientId } = req.params;

    if (!patientId || !subscriptionId) {
      res.status(400).json({
        success: false,
        message:
          "Missing required fields: patientId, subscriptionId, or paymentDetails.upiId",
      });
      return;
    }

    // Find patient
    const patient: any = await Patient.findOne({ userId: patientId }).populate({
      path: "userId",
      select: "firstName lastName email phone countryCode",
    });

    if (!patient) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    console.log("patient on subscribe: ", patient);

    // Find subscription
    const subscription = await PatientSubscription.findById(subscriptionId);
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
      message: "Patient subscribed successfully",
      data: {
        order,
        prefill: {
          name: patient.userId.firstName + " " + patient.userId.lastName,
          email: patient.userId.email,
          contact: patient.userId.phone,
          countryCode: patient.userId.countryCode || "+91",
        },
      },
    });
  } catch (error) {
    console.error("Error in subscribing patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe patient",
      error: error,
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
        message:
          "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId, userId",
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
      const patient: any = await Patient.findOne({ userId: userId });

      if (!patient) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      const subscription = await PatientSubscription.findById(subscriptionId);
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
            message: "Invalid subscription duration",
          });
          return;
      }

      const newSubscription = {
        startDate: new Date(),
        endDate,
        razorpay_order_id,
        razorpay_payment_id,
        SubscriptionId: subscription._id,
      };

      patient.subscriptions.push(newSubscription);

      await patient.save();

      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: patient,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: (err as Error).message });
  }
};


export const getPatientById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid patient ID format",
      });
      return;
    }

    // Find patient by patient ID and populate user details
    const patient = await Patient.findById(id)
      .populate({
        path: "userId",
        select: "-password",
      })
      .select("-password");

    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Generate signed URLs for the patient data
    const patientWithSignedUrls = await generateSignedUrlsForUser(patient);

    res.status(200).json({
      success: true,
      message: "Patient details fetched successfully",
      data: patientWithSignedUrls,
    });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patient details",
    });
  }
};

export const patientOnboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const {
      prefix,
      profilePic,
      gender,
      dob,
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      mapLocation,
      insurance,
      healthMetrics,
    } = req.body;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
      return;
    }

    // Check if user exists and has patient role
    const user = await User.findOne({ _id: userId });
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found or not a patient",
      });
      return;
    }

    // Validate required fields
    if (!gender || !dob || !address) {
      res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
      return;
    }

    // Prepare update data
    const updateData = {
      prefix,
      profilePic,
      gender,
      dob: new Date(dob),
      address,
      personalIdProof,
      addressProof,
      bankDetails,
      mapLocation,
      insurance,
      healthMetrics: healthMetrics,
    };

    // Update patient using discriminator model
    const updatedPatient = await Patient.findOneAndUpdate(
      { userId },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        select: "-password",
      }
    );

    if (!updatedPatient) {
      res.status(500).json({
        success: false,
        message: "Failed to update patient information",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Patient onboarded successfully",
      data: updatedPatient,
    });
  } catch (error) {
    console.error("Error in patient onboarding:", error);
    res.status(500).json({
      success: false,
      message: "Failed to onboard patient",
      error: (error as Error).message,
    });
  }
};

export const getPatientDashboard = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;
    const patient = await Patient.findOne({ userId }).populate(
      "userId",
      "firstName lastName profilePic"
    );

    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // pending
    // Find all emergency appointments for this patient
    const appointments = await EmergencyAppointment.find({
      patientId: patient._id,
      status: { $in: ["in-progress", "pending"] },
    })
      .populate({
        path: "patientId",
        select: "userId",
        populate: {
          path: "userId",
          select: "firstName lastName countryCode phone email profilePic",
        },
      })
      .sort({ createdAt: -1 }); // Sort by newest first

    // Convert media keys to signed URLs
    const emergencyAppointmentsWithUrls = await convertMediaKeysToUrls(
      appointments
    );

    const currentDate = new Date();

    // Get online appointment counts
    const [upcomingOnline, completedOnline, cancelledOnline, allOnline] =
      await Promise.all([
        // Upcoming online appointments (accepted and time is in future)
        OnlineAppointment.countDocuments({
          patientId: userId,
          status: "accepted",
          "slot.time.start": { $gte: currentDate },
        }),
        // Completed online appointments (accepted and time is in past)
        OnlineAppointment.countDocuments({
          patientId: userId,
          status: "accepted",
          "slot.time.start": { $lt: currentDate },
        }),
        // Cancelled online appointments (rejected)
        OnlineAppointment.countDocuments({
          patientId: userId,
          status: "rejected",
        }),
        // All online appointments for the patient
        OnlineAppointment.countDocuments({
          patientId: userId,
        }),
      ]);

    // Get clinic appointment counts
    const [upcomingClinic, completedClinic, cancelledClinic, allClinic] =
      await Promise.all([
        // Upcoming clinic appointments (confirmed and day is today or in future)
        ClinicAppointment.countDocuments({
          patientId: userId,
          status: "confirmed",
          "slot.day": { $gte: new Date(currentDate.toDateString()) },
        }),
        // Completed clinic appointments
        ClinicAppointment.countDocuments({
          patientId: userId,
          status: "completed",
        }),
        // Cancelled clinic appointments
        ClinicAppointment.countDocuments({
          patientId: userId,
          status: "cancelled",
        }),
        // All clinic appointments for the patient
        ClinicAppointment.countDocuments({
          patientId: userId,
        }),
      ]);

    // Get emergency appointment counts
    const [
      pendingEmergency,
      inProgressEmergency,
      completedEmergency,
      allEmergency,
    ] = await Promise.all([
      // Pending emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "pending",
      }),
      // In-progress emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "in-progress",
      }),
      // Completed emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
        status: "completed",
      }),
      // All emergency appointments
      EmergencyAppointment.countDocuments({
        patientId: patient._id,
      }),
    ]);

    // Combine all appointment types counts
    const appointmentCounts = {
      upcoming: upcomingOnline + pendingEmergency + upcomingClinic, // Include confirmed clinic appointments
      completed: completedOnline + completedEmergency + completedClinic,
      cancelled: cancelledOnline + cancelledClinic, // Both online and clinic appointments can be cancelled
      all: allOnline + allEmergency + allClinic, // Total of all appointments
    };

    // Get recommended doctors based on patient's health conditions
    let recommendedDoctors: any[] = [];
    // If no condition-based recommendations, get general recommended doctors
    if (recommendedDoctors.length === 0) {
      const now = new Date();
      recommendedDoctors = await Doctor.find({
        status: "approved",
        subscriptions: {
          $elemMatch: {
            endDate: { $gt: now }
          }
        },
        userId: { $ne: userId },
      })
        .populate({
          path: "userId",
          select: "firstName lastName profilePic isDocumentVerified",
        })
        .select("userId specialization experience onlineAppointment homeVisit clinicVisit")
        .limit(10);

      recommendedDoctors = recommendedDoctors.filter(doctor => doctor.userId && doctor.userId.isDocumentVerified);
    }
    console.log("Recommended Doctors ",recommendedDoctors)

    // Process recommended doctors to add signed URLs
    const processedDoctors = await Promise.all(
      recommendedDoctors.map((doctor) => generateSignedUrlsForDoctor(doctor))
    );

    res.status(200).json({
      success: true,
      message: "Patient dashboard data retrieved successfully",
      data: {
        appointmentCounts,
        emergencyAppointments: emergencyAppointmentsWithUrls,
        recommendedDoctors: processedDoctors,
      },
    });
  } catch (error) {
    console.error("Error getting patient dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get patient dashboard data",
      error: (error as Error).message,
    });
  }
};

export const updateBankDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    const { bankDetails } = req.body;
    if (!bankDetails || Object.keys(bankDetails).length === 0) {
      res.status(400).json({
        success: false,
        message: "No bank details provided",
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { bankDetails } }, // replace bankDetails object
      { new: true, runValidators: true, select: "-password" }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Bank details updated successfully",
      data: updatedUser.bankDetails, // return just bankDetails
    });
  } catch (error: any) {
    console.error("Error updating bank details:", error);
    res.status(500).json({
      success: false,
      message: "Error updating bank details",
      error: error.message,
    });
  }
};

export const updatePersonalInfo = async (
  req: Request,
  res: Response):
  Promise<void> => {
  try {
    const userId = req.user.id;

    const { firstName, lastName, email, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        email,
        phone,
      },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.json({
      message: "Personal info updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating personal info:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAppointmentsDoctorForPatient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Get online appointments
    const onlineAppointments = await OnlineAppointment.find({
      patientId: userId,
    }).populate({
      path: "doctorId",
      select: "specialization experience userId onlineAppointment",
      populate: {
        path: "userId",
        select: "firstName lastName profilePic",
      },
    });

    // Get clinic appointments
    const clinicAppointments = await ClinicAppointment.find({
      patientId: userId,
    }).populate({
      path: "doctorId",
      select: "specialization experience userId clinicVisit",
      populate: {
        path: "userId",
        select: "firstName lastName profilePic",
      },
    });

    // Add appointment type to differentiate between online and clinic appointments
    const onlineAppointmentsWithType = onlineAppointments.map(
      (appointment) => ({
        ...appointment.toObject(),
        appointmentType: "online",
      })
    );

    // Add clinic details and appointment type to clinic appointments
    const clinicAppointmentsWithType = clinicAppointments.map((appointment) => {
      const appointmentObj = appointment.toObject();
      const doctor = appointmentObj.doctorId as any;
      const clinicVisit = doctor?.clinicVisit as any;
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

    // Generate signed URLs for profile pictures
    const appointmentsWithSignedUrls = await Promise.all(
      allAppointments.map(async (appointment) => {
        if (appointment.doctorId) {
          appointment.doctorId = await generateSignedUrlsForDoctor(
            appointment.doctorId
          );
        }
        return appointment;
      })
    );

    // Sort by creation date (most recent first)
    appointmentsWithSignedUrls.sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
    );

    res.status(200).json({
      success: true,
      message: "Appointments for patient retrieved successfully",
      data: appointmentsWithSignedUrls,
    });
  } catch (error) {
    console.error("Error in getting appointments for patient:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get appointments for patient",
      error: (error as Error).message,
    });
  }
};

export const updateHealthMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Validate request body
    const validationResult = updateHealthMetricsSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.errors,
      });
      return;
    }

    // Find patient by userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    const updateData = validationResult.data;

    // Try to find existing health metrics for this patient
    let healthMetrics = await HealthMetrics.findOne({ patientId: patient._id });

    if (healthMetrics) {
      // Update existing health metrics document
      healthMetrics = await HealthMetrics.findOneAndUpdate(
        { patientId: patient._id },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({
        success: true,
        message: "Health metrics updated successfully",
        data: healthMetrics,
      });
    } else {
      // Create new health metrics document if none exists
      healthMetrics = new HealthMetrics({
        patientId: patient._id,
        ...updateData,
      });

      const savedHealthMetrics = await healthMetrics.save();

      patient.healthMetricsId = savedHealthMetrics._id;

      await patient.save();

      res.status(201).json({
        success: true,
        message: "Health metrics created successfully",
        data: savedHealthMetrics,
      });
    }
  } catch (error) {
    console.error("Error updating health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update health metrics",
      error: (error as Error).message,
    });
  }
};

export const getHealthMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user.id;

    // Find patient by userId
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      res.status(404).json({
        success: false,
        message: "Patient not found",
      });
      return;
    }

    // Find health metrics for this patient
    const healthMetrics = await HealthMetrics.findOne({
      patientId: patient._id,
    });

    if (!healthMetrics) {
      res.status(404).json({
        success: false,
        message: "Health metrics not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Health metrics retrieved successfully",
      data: healthMetrics,
    });
  } catch (error) {
    console.error("Error fetching health metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch health metrics",
      error: (error as Error).message,
    });
  }
};
