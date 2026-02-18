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
exports.updateDoctorActiveStatus = exports.getDoctorDashboard = exports.getDoctorAppointmentStats = exports.getAllPatientsForDoctor = exports.getDoctorById = exports.verifyPaymentSubscription = exports.subscribeDoctor = exports.validateCoupon = exports.doctorOnboardV2 = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
const doctor_subscription_coupon_1 = __importDefault(require("../../models/doctor-subscription-coupon"));
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const signed_url_1 = require("../../utils/signed-url");
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const homevisit_appointment_model_1 = __importDefault(require("../../models/appointment/homevisit-appointment-model"));
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = require("../../config/razorpay");
const rating_model_1 = require("../../models/appointment/rating-model");
// Store timeout references for auto-disable functionality
const doctorTimeouts = new Map();
const doctorOnboardV2 = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { userId } = req.params;
        // Accept JSON body: either raw body (application/json) or body.data (legacy)
        const data = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : req.body;
        if (!data || (typeof data === "string" && !data.trim())) {
            res.status(400).json({
                success: false,
                message: "Please include the required onboarding data.",
                action: "doctorOnboardV2:missing-data",
            });
            return;
        }
        const parsedData = typeof data === "string" ? JSON.parse(data) : data;
        // Destructure fields from parsedData
        const { prefix, firstName, lastName, gender, dob, address, personalIdProof, addressProof, bankDetails, qualifications, registration, experience, specialization, taxProof, } = parsedData;
        // Parse JSON strings if sent as strings (for nested objects)
        const parsedQualifications = typeof qualifications === "string"
            ? JSON.parse(qualifications)
            : qualifications !== null && qualifications !== void 0 ? qualifications : [];
        const parsedRegistration = typeof registration === "string"
            ? JSON.parse(registration)
            : registration !== null && registration !== void 0 ? registration : [];
        const parsedExperience = typeof experience === "string" ? JSON.parse(experience) : experience !== null && experience !== void 0 ? experience : [];
        const parsedPersonalIdProof = typeof personalIdProof === "string"
            ? JSON.parse(personalIdProof)
            : personalIdProof !== null && personalIdProof !== void 0 ? personalIdProof : {};
        const parsedAddressProof = typeof addressProof === "string"
            ? JSON.parse(addressProof)
            : addressProof !== null && addressProof !== void 0 ? addressProof : {};
        const parsedBankDetails = typeof bankDetails === "string"
            ? JSON.parse(bankDetails)
            : bankDetails !== null && bankDetails !== void 0 ? bankDetails : {};
        const parsedTaxProof = typeof taxProof === "string" ? JSON.parse(taxProof) : taxProof;
        // Validate userId
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: "The user ID provided is invalid.",
                action: "doctorOnboardV2:invalid-user-id",
            });
            return;
        }
        // Check if user exists and has doctor role
        const user = yield user_model_1.default.findOne({
            _id: userId,
            roles: { $in: ["doctor"] },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                message: "We couldn't find the user or they are not registered as a doctor.",
                action: "doctorOnboardV2:user-not-found",
            });
            return;
        }
        // Required: only personal details (media uploaded via /media/upload; payload has S3 keys only)
        if (!firstName ||
            !lastName ||
            !gender ||
            !dob ||
            !address ||
            !specialization) {
            res.status(400).json({
                success: false,
                message: "Please fill in all required doctor details.",
                action: "doctorOnboardV2:missing-required-fields",
            });
            return;
        }
        // All image fields are S3 keys (strings) from the client
        const profilePicUrl = typeof parsedData.profilePic === "string"
            ? parsedData.profilePic
            : undefined;
        const signatureImageUrl = typeof parsedData.signatureImage === "string"
            ? parsedData.signatureImage
            : undefined;
        const personalIdProofImageUrl = typeof (parsedPersonalIdProof === null || parsedPersonalIdProof === void 0 ? void 0 : parsedPersonalIdProof.image) === "string"
            ? parsedPersonalIdProof.image
            : undefined;
        const addressProofImageUrl = typeof (parsedAddressProof === null || parsedAddressProof === void 0 ? void 0 : parsedAddressProof.image) === "string"
            ? parsedAddressProof.image
            : undefined;
        const upiQrImageUrl = typeof (parsedBankDetails === null || parsedBankDetails === void 0 ? void 0 : parsedBankDetails.upiQrImage) === "string"
            ? parsedBankDetails.upiQrImage
            : undefined;
        const taxProofImageUrl = typeof (parsedTaxProof === null || parsedTaxProof === void 0 ? void 0 : parsedTaxProof.image) === "string"
            ? parsedTaxProof.image
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
            personalIdProof: Object.assign(Object.assign({}, parsedPersonalIdProof), { image: personalIdProofImageUrl }),
            addressProof: Object.assign(Object.assign({}, parsedAddressProof), { image: addressProofImageUrl }),
            bankDetails: Object.assign(Object.assign({}, parsedBankDetails), { upiQrImage: upiQrImageUrl }),
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
            personalIdProof: Object.assign(Object.assign({}, parsedPersonalIdProof), { image: personalIdProofImageUrl }),
            addressProof: Object.assign(Object.assign({}, parsedAddressProof), { image: addressProofImageUrl }),
            bankDetails: Object.assign(Object.assign({}, parsedBankDetails), { upiQrImage: upiQrImageUrl }),
            taxProof: parsedTaxProof
                ? Object.assign(Object.assign({}, parsedTaxProof), { image: taxProofImageUrl }) : undefined,
        };
        const [updatedUser, updatedDoctor] = yield Promise.all([
            user_model_1.default.findByIdAndUpdate(userId, { $set: userUpdateData }, { new: true, runValidators: true }),
            doctor_model_1.default.findOneAndUpdate({ userId }, { $set: doctorUpdateData }, { new: true, runValidators: true }),
        ]);
        if (!updatedDoctor || !updatedUser) {
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
            data: doctorUpdateData,
        });
    }
    catch (error) {
        console.error("Error in doctor onboarding:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't complete the doctor onboarding.",
            action: error.message,
        });
    }
});
exports.doctorOnboardV2 = doctorOnboardV2;
/** Validates coupon for a subscription; returns discount info or error message. */
function validateCouponForSubscription(code, subscriptionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const normalizedCode = String(code).trim().toUpperCase();
        if (!normalizedCode) {
            return { valid: false, message: "Coupon code is required." };
        }
        const subscription = yield doctor_subscription_1.default.findById(subscriptionId);
        if (!subscription) {
            return { valid: false, message: "Subscription plan not found." };
        }
        const coupon = yield doctor_subscription_coupon_1.default.findOne({ code: normalizedCode });
        if (!coupon) {
            return { valid: false, message: "Invalid coupon code." };
        }
        if (!coupon.isActive) {
            return { valid: false, message: "This coupon is no longer active." };
        }
        const now = new Date();
        if (coupon.validFrom && now < new Date(coupon.validFrom)) {
            return { valid: false, message: "This coupon is not yet valid." };
        }
        if (coupon.validUntil && now > new Date(coupon.validUntil)) {
            return { valid: false, message: "This coupon has expired." };
        }
        if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
            return { valid: false, message: "This coupon has reached its usage limit." };
        }
        const applicableIds = coupon.applicableSubscriptionIds || [];
        const appliesToAll = applicableIds.length === 0;
        const appliesToThis = applicableIds.some((id) => id && id.toString() === subscriptionId);
        if (!appliesToAll && !appliesToThis) {
            return { valid: false, message: "This coupon does not apply to the selected plan." };
        }
        return { valid: true, discountPercent: coupon.discountPercent };
    });
}
const validateCoupon = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, subscriptionId } = req.body;
        if (!code || !subscriptionId) {
            res.status(400).json({
                success: false,
                message: "Code and subscriptionId are required.",
                action: "validateCoupon:missing-fields",
            });
            return;
        }
        const result = yield validateCouponForSubscription(code, subscriptionId);
        if (!result.valid) {
            res.status(200).json({
                success: true,
                valid: false,
                message: result.message,
                data: { valid: false, message: result.message },
            });
            return;
        }
        res.status(200).json({
            success: true,
            valid: true,
            message: "Coupon applied.",
            data: { valid: true, discountPercent: result.discountPercent },
        });
    }
    catch (error) {
        console.error("Error validating coupon:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't validate the coupon.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.validateCoupon = validateCoupon;
const subscribeDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.body.data) {
            res.status(400).json({
                success: false,
                message: "Please include the required form data.",
                action: "subscribeDoctor:missing-json",
            });
            return;
        }
        let formData;
        try {
            formData = JSON.parse(req.body.data);
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: "We couldn't read the submitted information.",
                action: "subscribeDoctor:invalid-json",
            });
            return;
        }
        const { subscriptionId, couponCode } = formData;
        const { doctorId } = req.params;
        if (!doctorId || !subscriptionId) {
            res.status(400).json({
                success: false,
                message: "Missing required details. Please provide the doctor and subscription IDs.",
                action: "subscribeDoctor:missing-fields",
            });
            return;
        }
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId }).populate({
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
        const subscription = yield doctor_subscription_1.default.findById(subscriptionId);
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
        let discountPercent = 0;
        let finalAmount = subscription.price;
        if (couponCode && String(couponCode).trim()) {
            const couponResult = yield validateCouponForSubscription(String(couponCode).trim(), subscriptionId);
            if (couponResult.valid) {
                discountPercent = couponResult.discountPercent;
                finalAmount = Math.max(0, subscription.price * (1 - discountPercent / 100));
            }
        }
        const amountPaise = Math.round(finalAmount * 100);
        const options = {
            amount: amountPaise,
            currency: "INR",
            receipt: "receipt_" + Math.random().toString(36).substring(7),
        };
        const order = yield razorpay_1.razorpayConfig.orders.create(options);
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
                originalAmount: subscription.price,
                discountPercent,
                finalAmount,
                couponCode: discountPercent > 0 ? String(couponCode).trim().toUpperCase() : undefined,
            },
        });
    }
    catch (error) {
        console.error("Error in subscribing doctor:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't start the subscription.",
            action: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.subscribeDoctor = subscribeDoctor;
const verifyPaymentSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId, couponCode, discountPercent, amountBeforeDiscount, } = req.body;
        const userId = req.user.id;
        if (!razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !subscriptionId ||
            !userId) {
            res.status(400).json({
                success: false,
                message: "Please provide all payment verification details.",
                action: "verifyPaymentSubscription:validate-input",
            });
            return;
        }
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto_1.default
            .createHmac("sha256", process.env.RAZ_KEY_SECRET || "")
            .update(sign.toString())
            .digest("hex");
        if (razorpay_signature === expectedSign) {
            // Payment is verified
            const doctor = yield doctor_model_1.default.findOne({ userId: userId });
            if (!doctor) {
                res.status(404).json({
                    success: false,
                    message: "We couldn't find the doctor for this subscription.",
                    action: "verifyPaymentSubscription:doctor-not-found",
                });
                return;
            }
            const subscription = yield doctor_subscription_1.default.findById(subscriptionId);
            if (!subscription) {
                res.status(404).json({
                    success: false,
                    message: "We couldn't find that subscription plan.",
                    action: "verifyPaymentSubscription:plan-not-found",
                });
                return;
            }
            if (!subscription.isActive) {
                res.status(400).json({
                    success: false,
                    message: "This subscription plan is currently inactive.",
                    action: "verifyPaymentSubscription:plan-inactive",
                });
                return;
            }
            const startDate = new Date();
            let endDate;
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
                        action: `verifyPaymentSubscription:invalid-duration:${subscription.duration}`,
                    });
                    return;
            }
            const amountBefore = amountBeforeDiscount != null ? Number(amountBeforeDiscount) : subscription.price;
            const newSubscription = {
                startDate: new Date(),
                endDate,
                razorpay_order_id,
                razorpay_payment_id,
                SubscriptionId: subscription._id,
                amount_paid: subscription.price,
            };
            if (couponCode && discountPercent != null) {
                newSubscription.couponCode = String(couponCode).trim().toUpperCase();
                newSubscription.discountPercent = Number(discountPercent);
                newSubscription.amountBeforeDiscount = amountBefore;
                newSubscription.amount_paid = Math.max(0, amountBefore * (1 - Number(discountPercent) / 100));
            }
            doctor.subscriptions.push(newSubscription);
            yield doctor.save();
            if (newSubscription.couponCode) {
                yield doctor_subscription_coupon_1.default.findOneAndUpdate({ code: newSubscription.couponCode }, { $inc: { usedCount: 1 } });
            }
            res.status(200).json({
                success: true,
                message: "Subscription payment verified successfully.",
                action: "verifyPaymentSubscription:success",
                data: doctor,
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: "We could not verify the payment signature.",
                action: "verifyPaymentSubscription:signature-mismatch",
            });
        }
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "We couldn't verify the subscription payment.",
            action: err.message,
        });
    }
});
exports.verifyPaymentSubscription = verifyPaymentSubscription;
const getDoctorById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
        const user = yield user_model_1.default.findOne({ _id: userId }).populate({
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
        if (!((_a = user === null || user === void 0 ? void 0 : user.roleRefs) === null || _a === void 0 ? void 0 : _a.doctor)) {
            res.status(404).json({
                success: false,
                message: "No doctor profile found for this user.",
                action: "getDoctorById:doctor-data-not-found",
            });
            return;
        }
        // Generate signed URLs for both user and doctor data
        const userWithUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(user);
        res.status(200).json({
            success: true,
            message: "Doctor details fetched successfully.",
            action: "getDoctorById:success",
            data: userWithUrls,
        });
    }
    catch (error) {
        console.error("Error fetching doctor:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't fetch the doctor details.",
            action: error.message,
        });
    }
});
exports.getDoctorById = getDoctorById;
const getAllPatientsForDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorUserId = req.user.id;
        // Find the doctor document using userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorUserId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor's user profile.",
                action: "getAllPatientsForDoctor:doctorUser-not-found",
            });
            return;
        }
        // Find all appointments for this doctor and get unique patients
        const appointments = yield online_appointment_model_1.default.find({
            doctorId: doctor._id,
        })
            .populate({
            path: "patientId",
            select: "userId",
            populate: {
                path: "userId",
                select: "firstName lastName countryCode phone gender email profilePic dob address",
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
        appointments.forEach((appointment) => {
            if (appointment.patientId &&
                !uniquePatients.has(appointment.patientId._id.toString())) {
                uniquePatients.set(appointment.patientId._id.toString(), Object.assign(Object.assign({}, appointment.patientId.toObject()), { lastAppointmentDate: appointment.slot.day, totalAppointments: 1 }));
            }
            else if (appointment.patientId &&
                uniquePatients.has(appointment.patientId._id.toString())) {
                // Update appointment count for existing patient
                const existingPatient = uniquePatients.get(appointment.patientId._id.toString());
                existingPatient.totalAppointments += 1;
                // Update last appointment date if this one is more recent
                if (new Date(appointment.slot.day) >
                    new Date(existingPatient.lastAppointmentDate)) {
                    existingPatient.lastAppointmentDate = appointment.slot.day;
                }
            }
        });
        // Convert Map to Array and generate signed URLs if needed
        const patientsArray = Array.from(uniquePatients.values());
        // Generate signed URLs for profile pictures if they exist
        const patientsWithSignedUrls = yield Promise.all(patientsArray.map((patient) => __awaiter(void 0, void 0, void 0, function* () {
            if (patient.userId.profilePic) {
                try {
                    const signedUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(patient.userId);
                    return Object.assign(Object.assign({}, patient), { userId: signedUrls });
                }
                catch (error) {
                    console.warn("Failed to generate signed URL for patient profile pic:", error);
                    return patient;
                }
            }
            return patient;
        })));
        res.status(200).json({
            success: true,
            message: "Patients retrieved successfully.",
            action: "getAllPatientsForDoctor:success",
            data: {
                patients: patientsWithSignedUrls,
                count: patientsWithSignedUrls.length,
            },
        });
    }
    catch (error) {
        console.error("Error getting patients for doctor:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load patients for this doctor.",
            action: error.message,
        });
    }
});
exports.getAllPatientsForDoctor = getAllPatientsForDoctor;
const getDoctorAppointmentStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorId = req.user.id; // Get doctor's user ID from auth middleware
        // Find the doctor document using userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "getDoctorAppointmentStats:doctor-not-found",
            });
            return;
        }
        // Get all online appointments for this doctor with populated patient data
        const onlineAppointments = yield online_appointment_model_1.default.find({
            doctorId: doctor._id,
        })
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode phone gender email profilePic dob address",
        })
            .sort({ "slot.day": -1, "slot.time.start": -1 }); // Sort by most recent first
        // Get all clinic appointments for this doctor with populated patient data
        const clinicAppointments = yield clinic_appointment_model_1.default.find({
            doctorId: doctor._id,
        })
            .populate({
            path: "patientId",
            select: "firstName lastName countryCode phone gender email profilePic dob address",
        })
            .sort({ "slot.day": -1, "slot.time.start": -1 }); // Sort by most recent first
        // Add appointment type to online appointments
        const onlineAppointmentsWithType = onlineAppointments.map((appointment) => (Object.assign(Object.assign({}, appointment.toObject()), { appointmentType: "online" })));
        // Add clinic details and appointment type to clinic appointments
        const clinicAppointmentsWithType = clinicAppointments.map((appointment) => {
            const appointmentObj = appointment.toObject();
            const clinicVisit = doctor.clinicVisit;
            const clinic = ((clinicVisit === null || clinicVisit === void 0 ? void 0 : clinicVisit.clinics) || []).find((c) => c._id.toString() === appointment.clinicId);
            return Object.assign(Object.assign({}, appointmentObj), { appointmentType: "clinic", clinicDetails: clinic
                    ? {
                        clinicName: clinic.clinicName,
                        address: clinic.address,
                        consultationFee: clinic.consultationFee,
                        frontDeskNumber: clinic.frontDeskNumber,
                        operationalDays: clinic.operationalDays,
                        timeSlots: clinic.timeSlots,
                        isActive: clinic.isActive,
                    }
                    : null });
        });
        // Combine all appointments
        const allAppointments = [
            ...onlineAppointmentsWithType,
            ...clinicAppointmentsWithType,
        ];
        // Calculate counts by status for all appointments
        const pendingCount = allAppointments.filter((app) => app.status === "pending").length;
        const acceptedConfirmedCount = allAppointments.filter((app) => app.status === "accepted").length;
        const rejectedCancelledCount = allAppointments.filter((app) => app.status === "rejected").length;
        const completedCount = allAppointments.filter((app) => app.status === "completed").length;
        const totalCount = allAppointments.length;
        // Generate signed URLs for patient profile pictures
        const appointmentsWithSignedUrls = yield Promise.all(allAppointments.map((appointment) => __awaiter(void 0, void 0, void 0, function* () {
            let patientWithUrls = appointment.patientId;
            if (appointment.patientId && appointment.patientId.profilePic) {
                try {
                    patientWithUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(appointment.patientId);
                }
                catch (error) {
                    console.warn("Failed to generate signed URL for patient profile pic:", error);
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
        })));
        // Sort by creation date (most recent first)
        appointmentsWithSignedUrls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    }
    catch (error) {
        console.error("Error getting doctor appointment stats:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load appointment statistics.",
            action: error.message,
        });
    }
});
exports.getDoctorAppointmentStats = getDoctorAppointmentStats;
const getDoctorDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const doctorId = req.user.id;
        // Find the doctor document using userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId }).select('_id');
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "We couldn't find your doctor profile.",
                action: "getDoctorDashboard:doctor-not-found",
            });
            return;
        }
        // Use aggregation for efficient stats calculation and get ratings in parallel
        const [onlineStats, emergencyStats, clinicStats, homeVisitStats, ratingsData, recentEmergencies,] = yield Promise.all([
            // Online appointments stats
            online_appointment_model_1.default.aggregate([
                { $match: { doctorId: doctor._id } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),
            // Emergency appointments stats
            emergency_appointment_model_1.default.aggregate([
                { $match: { doctorId: doctor._id } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),
            // Clinic appointments stats
            clinic_appointment_model_1.default.aggregate([
                { $match: { doctorId: doctor._id } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),
            // Home visit appointments stats
            homevisit_appointment_model_1.default.aggregate([
                { $match: { doctorId: doctor._id } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),
            // Ratings data
            rating_model_1.RatingModel.aggregate([
                { $match: { doctorId: doctor._id } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        average: { $avg: "$rating" },
                    },
                },
            ]),
            // Recent non-completed emergency appointments (limited to 5)
            emergency_appointment_model_1.default.find({
                doctorId: doctor._id,
                status: { $ne: "completed" },
            })
                .populate({
                path: "patientId",
                select: "userId",
                populate: {
                    path: "userId",
                    select: "firstName lastName countryCode phone email profilePic",
                },
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
        ]);
        // Helper function to process aggregation results
        const processStats = (stats) => {
            const result = { pending: 0, accepted: 0, completed: 0, inProgress: 0, total: 0 };
            stats.forEach((stat) => {
                const status = stat._id;
                const count = stat.count;
                result.total += count;
                if (status === "pending")
                    result.pending = count;
                else if (status === "accepted")
                    result.accepted = count;
                else if (status === "completed")
                    result.completed = count;
                else if (status === "in-progress")
                    result.inProgress = count;
                else if (status === "doctor_accepted")
                    result.pending += count;
                else if (status === "patient_confirmed")
                    result.accepted += count;
            });
            return result;
        };
        // Process stats from aggregations
        const online = processStats(onlineStats);
        const emergency = processStats(emergencyStats);
        const clinic = processStats(clinicStats);
        const homeVisit = processStats(homeVisitStats);
        // Calculate total appointments across all types
        const totalStats = {
            total: online.total + emergency.total + clinic.total + homeVisit.total,
            pending: online.pending + emergency.pending + clinic.pending + homeVisit.pending,
            active: online.accepted + emergency.inProgress + clinic.accepted + homeVisit.accepted,
            completed: online.completed + emergency.completed + clinic.completed + homeVisit.completed,
        };
        // Process emergency appointments to add presigned URLs
        const processedEmergencyAppointments = yield Promise.all(recentEmergencies.map((appointment) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const appointmentObj = Object.assign({}, appointment);
            try {
                // Generate presigned URLs for media array if it exists
                if (Array.isArray(appointmentObj.media) && appointmentObj.media.length > 0) {
                    const mediaPromises = appointmentObj.media
                        .filter((key) => key && typeof key === "string" && key.trim() !== "")
                        .map((mediaKey) => (0, upload_media_1.GetSignedUrl)(mediaKey).catch((err) => {
                        console.warn("Failed to generate signed URL for media:", mediaKey, err);
                        return mediaKey; // Return original key on failure
                    }));
                    appointmentObj.media = yield Promise.all(mediaPromises);
                }
                // Generate presigned URL for patient's profile picture if it exists
                if (((_b = (_a = appointmentObj.patientId) === null || _a === void 0 ? void 0 : _a.userId) === null || _b === void 0 ? void 0 : _b.profilePic) &&
                    typeof appointmentObj.patientId.userId.profilePic === "string") {
                    appointmentObj.patientId.userId.profilePic = yield (0, upload_media_1.GetSignedUrl)(appointmentObj.patientId.userId.profilePic).catch((err) => {
                        console.warn("Failed to generate signed URL for profile pic:", err);
                        return appointmentObj.patientId.userId.profilePic; // Return original on failure
                    });
                }
            }
            catch (error) {
                console.error("Error processing emergency appointment:", error);
            }
            return appointmentObj;
        })));
        // Prepare dashboard data
        const dashboardData = {
            appointmentStats: totalStats,
            reviews: {
                total: ((_a = ratingsData[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
                average: ((_b = ratingsData[0]) === null || _b === void 0 ? void 0 : _b.average) ? Number(ratingsData[0].average.toFixed(1)) : 0,
            },
            recentEmergencyAppointments: processedEmergencyAppointments,
        };
        res.status(200).json({
            success: true,
            message: "Doctor dashboard data retrieved successfully.",
            action: "getDoctorDashboard:success",
            data: dashboardData,
        });
    }
    catch (error) {
        console.error("Error getting doctor dashboard:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't load the doctor dashboard.",
            action: error.message,
        });
    }
});
exports.getDoctorDashboard = getDoctorDashboard;
const updateDoctorActiveStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
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
        const updatedDoctor = yield doctor_model_1.default.findOneAndUpdate({ userId: doctorId }, { $set: { isActive: isActive } }, {
            new: true,
            runValidators: true,
        });
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
            const timeoutId = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    yield doctor_model_1.default.findOneAndUpdate({ userId: doctorId }, { $set: { isActive: false } }, { new: true });
                    console.log(`Doctor ${doctorId} automatically set to inactive after 1 hour`);
                    doctorTimeouts.delete(doctorId);
                }
                catch (error) {
                    console.error(`Failed to auto-disable doctor ${doctorId}:`, error);
                }
            }), 2 * 60 * 1000); // 2 minutes in milliseconds
            // Store the timeout reference
            doctorTimeouts.set(doctorId, timeoutId);
        }
        res.status(200).json({
            success: true,
            message: `Doctor status updated to ${isActive ? "active" : "inactive"}${isActive
                ? ". The system will automatically set it to inactive soon."
                : ""}`,
            action: "updateDoctorActiveStatus:success",
            data: {
                isActive: updatedDoctor.isActive,
                activationTime: isActive ? activationTime : null,
                deactivationTime: isActive
                    ? new Date(activationTime.getTime() + 2 * 60 * 1000)
                    : null, // 2 minutes from activation
            },
        });
    }
    catch (error) {
        console.error("Error updating doctor active status:", error);
        res.status(500).json({
            success: false,
            message: "We couldn't update the doctor active status.",
            action: error.message,
        });
    }
});
exports.updateDoctorActiveStatus = updateDoctorActiveStatus;
