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
exports.updateDoctorActiveStatus = exports.getDoctorDashboard = exports.getDoctorAppointmentStats = exports.getAllPatientsForDoctor = exports.getDoctorById = exports.verifyPaymentSubscription = exports.subscribeDoctor = exports.doctorOnboardV2 = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../../models/user/user-model"));
const doctor_model_1 = __importDefault(require("../../models/user/doctor-model"));
const doctor_subscription_1 = __importDefault(require("../../models/doctor-subscription"));
const upload_media_1 = require("../../utils/aws_s3/upload-media");
const path_1 = __importDefault(require("path"));
const signed_url_1 = require("../../utils/signed-url");
const online_appointment_model_1 = __importDefault(require("../../models/appointment/online-appointment-model"));
const clinic_appointment_model_1 = __importDefault(require("../../models/appointment/clinic-appointment-model"));
const emergency_appointment_model_1 = __importDefault(require("../../models/appointment/emergency-appointment-model"));
const crypto_1 = __importDefault(require("crypto"));
const razorpay_1 = require("../../config/razorpay");
// Store timeout references for auto-disable functionality
const doctorTimeouts = new Map();
const doctorOnboardV2 = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
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
        const { prefix, firstName, lastName, gender, dob, address, personalIdProof, addressProof, bankDetails, qualifications, registration, experience, specialization, taxProof, } = parsedData;
        console.log("Parsed data:", parsedData);
        // Parse JSON strings if sent as strings (for nested objects)
        const parsedQualifications = typeof qualifications === "string"
            ? JSON.parse(qualifications)
            : qualifications;
        const parsedRegistration = typeof registration === "string"
            ? JSON.parse(registration)
            : registration;
        const parsedExperience = typeof experience === "string" ? JSON.parse(experience) : experience;
        const parsedPersonalIdProof = typeof personalIdProof === "string"
            ? JSON.parse(personalIdProof)
            : personalIdProof;
        const parsedAddressProof = typeof addressProof === "string"
            ? JSON.parse(addressProof)
            : addressProof;
        const parsedBankDetails = typeof bankDetails === "string" ? JSON.parse(bankDetails) : bankDetails;
        const parsedTaxProof = typeof taxProof === "string" ? JSON.parse(taxProof) : taxProof;
        // Validate userId
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID format",
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
                message: "User not found or not a doctor",
            });
            return;
        }
        // Handle file uploads
        const files = req.files;
        console.log("Files:", files);
        // Validate required fields
        if (!firstName ||
            !lastName ||
            !gender ||
            !dob ||
            !address ||
            !parsedQualifications ||
            !parsedRegistration ||
            !parsedExperience ||
            !parsedBankDetails ||
            !specialization) {
            res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
            return;
        }
        // Helper function to generate unique file name and S3 key
        const generateS3Key = (file) => {
            const timestamp = Date.now();
            const originalName = file.originalname;
            const extension = path_1.default.extname(originalName);
            const fileName = `${path_1.default.basename(originalName, extension)}_${timestamp}${extension}`;
            const key = `uploads/${fileName}`;
            return { key, fileName };
        };
        // Upload degreeImages and map to qualifications
        const degreeImages = files["degreeImages"] || [];
        let degreeImageUrls = [];
        if (degreeImages.length > 0) {
            const degreeImagePromises = degreeImages.map((file) => {
                const { key, fileName } = generateS3Key(file);
                return (0, upload_media_1.UploadImgToS3)({
                    key,
                    fileBuffer: file.buffer,
                    fileName,
                });
            });
            degreeImageUrls = yield Promise.all(degreeImagePromises);
            parsedQualifications.forEach((qual, index) => {
                if (degreeImageUrls[index]) {
                    qual.degreeImage = degreeImageUrls[index];
                }
            });
        }
        parsedQualifications.forEach((qual, index) => {
            qual.degreeImage = degreeImageUrls[index] || qual.degreeImage; // Preserve existing if no new image
        });
        // Upload licenseImages and map to registration
        const licenseImages = files["licenseImages"] || [];
        let licenseImageUrls = [];
        if (licenseImages.length > 0) {
            const licenseImagePromises = licenseImages.map((file) => {
                const { key, fileName } = generateS3Key(file);
                return (0, upload_media_1.UploadImgToS3)({
                    key,
                    fileBuffer: file.buffer,
                    fileName,
                });
            });
            licenseImageUrls = yield Promise.all(licenseImagePromises);
            parsedRegistration.forEach((reg, index) => {
                if (licenseImageUrls[index]) {
                    reg.licenseImage = licenseImageUrls[index];
                }
            });
        }
        parsedRegistration.forEach((reg, index) => {
            reg.licenseImage = licenseImageUrls[index] || reg.licenseImage; // Preserve existing if no new image
        });
        // Prepare all single image uploads in parallel
        const singleImageUploads = [];
        const singleImageKeys = [];
        if ((_a = files["signatureImage"]) === null || _a === void 0 ? void 0 : _a[0]) {
            const { key, fileName } = generateS3Key(files["signatureImage"][0]);
            singleImageUploads.push((0, upload_media_1.UploadImgToS3)({
                key,
                fileBuffer: files["signatureImage"][0].buffer,
                fileName,
            }));
            singleImageKeys.push("signatureImage");
        }
        if ((_b = files["upiqrImage"]) === null || _b === void 0 ? void 0 : _b[0]) {
            const { key, fileName } = generateS3Key(files["upiqrImage"][0]);
            singleImageUploads.push((0, upload_media_1.UploadImgToS3)({
                key,
                fileBuffer: files["upiqrImage"][0].buffer,
                fileName,
            }));
            singleImageKeys.push("upiqrImage");
        }
        if ((_c = files["profilePic"]) === null || _c === void 0 ? void 0 : _c[0]) {
            const { key, fileName } = generateS3Key(files["profilePic"][0]);
            singleImageUploads.push((0, upload_media_1.UploadImgToS3)({
                key,
                fileBuffer: files["profilePic"][0].buffer,
                fileName,
            }));
            singleImageKeys.push("profilePic");
        }
        if ((_d = files["personalIdProofImage"]) === null || _d === void 0 ? void 0 : _d[0]) {
            const { key, fileName } = generateS3Key(files["personalIdProofImage"][0]);
            singleImageUploads.push((0, upload_media_1.UploadImgToS3)({
                key,
                fileBuffer: files["personalIdProofImage"][0].buffer,
                fileName,
            }));
            singleImageKeys.push("personalIdProofImage");
        }
        if ((_e = files["addressProofImage"]) === null || _e === void 0 ? void 0 : _e[0]) {
            const { key, fileName } = generateS3Key(files["addressProofImage"][0]);
            singleImageUploads.push((0, upload_media_1.UploadImgToS3)({
                key,
                fileBuffer: files["addressProofImage"][0].buffer,
                fileName,
            }));
            singleImageKeys.push("addressProofImage");
        }
        if ((_f = files["taxImage"]) === null || _f === void 0 ? void 0 : _f[0]) {
            const { key, fileName } = generateS3Key(files["taxImage"][0]);
            singleImageUploads.push((0, upload_media_1.UploadImgToS3)({
                key,
                fileBuffer: files["taxImage"][0].buffer,
                fileName,
            }));
            singleImageKeys.push("taxImage");
        }
        // Upload all single images in parallel
        const singleImageUrls = yield Promise.all(singleImageUploads);
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
        console.log(" main data to update", doctorUpdateData);
        // Update both user and doctor using discriminator model
        const [updatedUser, updatedDoctor] = yield Promise.all([
            user_model_1.default.findByIdAndUpdate(userId, { $set: userUpdateData }, {
                new: true,
                runValidators: true,
            }),
            doctor_model_1.default.findOneAndUpdate({ userId }, { $set: doctorUpdateData }, {
                new: true,
                runValidators: true,
            }),
        ]);
        if (!updatedDoctor || !updatedUser) {
            console.log("the error is here", updatedDoctor, updatedUser);
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
    }
    catch (error) {
        console.error("Error in doctor onboarding:", error);
        res.status(500).json({
            success: false,
            message: "Failed to onboard doctor",
            error: error.message,
        });
    }
});
exports.doctorOnboardV2 = doctorOnboardV2;
const subscribeDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check for required form data
        if (!req.body.data) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: JSON data is required",
            });
            return;
        }
        // Parse JSON data from form
        let formData;
        try {
            formData = JSON.parse(req.body.data);
        }
        catch (error) {
            res.status(400).json({
                success: false,
                message: "Invalid JSON data format",
            });
            return;
        }
        const { subscriptionId } = formData;
        const { doctorId } = req.params;
        if (!doctorId || !subscriptionId) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: doctorId, subscriptionId, or paymentDetails.upiId",
            });
            return;
        }
        // Find doctor
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId }).populate({
            path: "userId",
            select: "firstName lastName email phone countryCode",
        });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        console.log("doctor on subscribe: ", doctor);
        // Find subscription
        const subscription = yield doctor_subscription_1.default.findById(subscriptionId);
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
        const order = yield razorpay_1.razorpayConfig.orders.create(options);
        console.log("order created: ", order);
        res.status(200).json({
            success: true,
            message: "Doctor subscription initiated successfully",
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
    }
    catch (error) {
        console.error("Error in subscribing doctor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to subscribe doctor",
            error: error,
        });
    }
});
exports.subscribeDoctor = subscribeDoctor;
const verifyPaymentSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId, } = req.body;
        const userId = req.user.id;
        if (!razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !subscriptionId ||
            !userId) {
            res.status(400).json({
                success: false,
                message: "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature, subscriptionId, userId",
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
                    message: "User not found",
                });
                return;
            }
            const subscription = yield doctor_subscription_1.default.findById(subscriptionId);
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
                amount_paid: subscription.price,
            };
            doctor.subscriptions.push(newSubscription);
            yield doctor.save();
            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                data: doctor,
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
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
                message: "userId is required",
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
        if (!((_a = user === null || user === void 0 ? void 0 : user.roleRefs) === null || _a === void 0 ? void 0 : _a.doctor)) {
            res.status(404).json({
                success: false,
                message: "Doctor data not found",
            });
            return;
        }
        // Generate signed URLs for both user and doctor data
        const userWithUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(user);
        res.status(200).json({
            success: true,
            message: "Doctor fetched successfully",
            data: userWithUrls,
        });
    }
    catch (error) {
        console.error("Error fetching doctor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch doctor",
            error: error.message,
        });
    }
});
exports.getDoctorById = getDoctorById;
const getAllPatientsForDoctor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorId = req.user.id; // Get doctor's user ID from auth middleware
        // Find the doctor document using userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Find all appointments for this doctor and get unique patients
        const appointments = yield online_appointment_model_1.default.find({
            doctorId: doctor._id,
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
            if (patient.profilePic) {
                try {
                    const signedUrls = yield (0, signed_url_1.generateSignedUrlsForUser)(patient);
                    return signedUrls;
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
            data: patientsWithSignedUrls,
            count: patientsWithSignedUrls.length,
            message: "Patients retrieved successfully",
        });
    }
    catch (error) {
        console.error("Error getting patients for doctor:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get patients",
            error: error.message,
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
                message: "Doctor not found",
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
        const acceptedConfirmedCount = allAppointments.filter((app) => app.status === "accepted" || app.status === "confirmed").length;
        const rejectedCancelledCount = allAppointments.filter((app) => app.status === "rejected" || app.status === "cancelled").length;
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
            data: stats,
            message: "Doctor appointment statistics retrieved successfully",
        });
    }
    catch (error) {
        console.error("Error getting doctor appointment stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get appointment statistics",
            error: error.message,
        });
    }
});
exports.getDoctorAppointmentStats = getDoctorAppointmentStats;
const getDoctorDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const doctorId = req.user.id; // Get doctor's user ID from auth middleware
        // Find the doctor document using userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
        if (!doctor) {
            res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
            return;
        }
        // Get all appointments for this doctor
        const [onlineAppointments, emergencyAppointments] = yield Promise.all([
            online_appointment_model_1.default.find({
                doctorId: doctor._id,
            })
                .populate({
                path: "patientId",
                select: "firstName lastName profilePic",
            })
                .sort({ "slot.day": -1, "slot.time.start": -1 }), // Sort by most recent first
            emergency_appointment_model_1.default.find({
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
                .sort({ createdAt: -1 }), // Sort by newest first
        ]);
        // Calculate online appointment counts by status
        const onlineStats = {
            total: onlineAppointments.length,
            pending: onlineAppointments.filter((app) => app.status === "pending")
                .length,
            accepted: onlineAppointments.filter((app) => app.status === "accepted")
                .length,
            rejected: onlineAppointments.filter((app) => app.status === "rejected")
                .length,
        };
        // Calculate emergency appointment counts by status
        const emergencyStats = {
            total: emergencyAppointments.length,
            pending: emergencyAppointments.filter((app) => app.status === "pending")
                .length,
            inProgress: emergencyAppointments.filter((app) => app.status === "in-progress").length,
            completed: emergencyAppointments.filter((app) => app.status === "completed").length,
        };
        // Calculate total appointments across both types
        const totalStats = {
            total: onlineStats.total + emergencyStats.total,
            pending: onlineStats.pending + emergencyStats.pending,
            active: onlineStats.accepted + emergencyStats.inProgress,
            completed: onlineStats.rejected + emergencyStats.completed, // Including rejected online appointments in completed count
        };
        // Process emergency appointments to add presigned URLs
        const processedEmergencyAppointments = yield Promise.all(emergencyAppointments.map((appointment) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const appointmentObj = appointment.toObject();
            // Generate presigned URLs for media array if it exists
            if (Array.isArray(appointmentObj.media)) {
                appointmentObj.media = yield Promise.all(appointmentObj.media.map((mediaKey) => __awaiter(void 0, void 0, void 0, function* () {
                    if (mediaKey &&
                        typeof mediaKey === "string" &&
                        mediaKey.trim() !== "") {
                        try {
                            return yield (0, upload_media_1.GetSignedUrl)(mediaKey);
                        }
                        catch (error) {
                            console.warn("Could not generate signed URL for media:", mediaKey, error);
                            return mediaKey;
                        }
                    }
                    return mediaKey;
                })));
            }
            // Generate presigned URL for patient's profile picture if it exists
            if ((_b = (_a = appointmentObj.patientId) === null || _a === void 0 ? void 0 : _a.userId) === null || _b === void 0 ? void 0 : _b.profilePic) {
                try {
                    appointmentObj.patientId.userId.profilePic = yield (0, upload_media_1.GetSignedUrl)(appointmentObj.patientId.userId.profilePic);
                }
                catch (error) {
                    console.warn("Could not generate signed URL for profile picture:", appointmentObj.patientId.userId.profilePic, error);
                }
            }
            return appointmentObj;
        })));
        // Prepare dashboard data
        const dashboardData = {
            appointmentStats: totalStats,
            reviews: {
                total: 0, // Set to 0 as requested
                average: 0,
            },
            // recentOnlineAppointments: onlineAppointments.slice(0, 5), // Get 5 most recent appointments
            recentEmergencyAppointments: processedEmergencyAppointments.slice(0, 5),
        };
        res.status(200).json({
            success: true,
            message: "Doctor dashboard data retrieved successfully",
            data: dashboardData,
        });
    }
    catch (error) {
        console.error("Error getting doctor dashboard:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get doctor dashboard data",
            error: error.message,
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
                message: "isActive must be a boolean value (true or false)",
            });
            return;
        }
        // Find the doctor document using userId
        const doctor = yield doctor_model_1.default.findOne({ userId: doctorId });
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
                message: "Failed to update doctor status",
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
            message: `Doctor status updated to ${isActive ? "active" : "inactive"}${isActive ? ". Will automatically disable after 1 hour." : ""}`,
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
            message: "Failed to update doctor active status",
            error: error.message,
        });
    }
});
exports.updateDoctorActiveStatus = updateDoctorActiveStatus;
