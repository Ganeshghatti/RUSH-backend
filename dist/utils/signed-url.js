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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSignedUrlsForFamilies = exports.generateSignedUrlsForFamily = exports.generateSignedUrlsForSubscriptions = exports.generateSignedUrlsForSubscription = exports.generateSignedUrlsForUser = exports.generateSignedUrlsForDoctor = void 0;
const upload_media_1 = require("./aws_s3/upload-media");
const generateSignedUrlsForDoctor = (doctor) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const clone = JSON.parse(JSON.stringify(doctor));
    const safeGetSignedUrl = (key) => __awaiter(void 0, void 0, void 0, function* () {
        if (!key || typeof key !== "string" || key.trim() === "")
            return key;
        try {
            return yield (0, upload_media_1.GetSignedUrl)(key);
        }
        catch (error) {
            console.warn("Could not generate signed URL for key:", key, error);
            return key;
        }
    });
    const promises = [];
    // Signature image
    promises.push(safeGetSignedUrl(clone.signatureImage).then((url) => {
        clone.signatureImage = url;
    }));
    // Qualifications
    if (Array === null || Array === void 0 ? void 0 : Array.isArray(clone === null || clone === void 0 ? void 0 : clone.qualifications)) {
        for (const qual of clone === null || clone === void 0 ? void 0 : clone.qualifications) {
            promises.push(safeGetSignedUrl(qual === null || qual === void 0 ? void 0 : qual.degreeImage).then((url) => {
                qual.degreeImage = url;
            }));
        }
    }
    // Registrations
    if (Array === null || Array === void 0 ? void 0 : Array.isArray(clone === null || clone === void 0 ? void 0 : clone.registration)) {
        for (const reg of clone === null || clone === void 0 ? void 0 : clone.registration) {
            promises.push(safeGetSignedUrl(reg === null || reg === void 0 ? void 0 : reg.licenseImage).then((url) => {
                reg.licenseImage = url;
            }));
        }
    }
    // Subscriptions
    if (Array === null || Array === void 0 ? void 0 : Array.isArray(clone === null || clone === void 0 ? void 0 : clone.subscriptions)) {
        for (const sub of clone === null || clone === void 0 ? void 0 : clone.subscriptions) {
            if ((_a = sub === null || sub === void 0 ? void 0 : sub.paymentDetails) === null || _a === void 0 ? void 0 : _a.paymentImage) {
                promises.push(safeGetSignedUrl((_b = sub === null || sub === void 0 ? void 0 : sub.paymentDetails) === null || _b === void 0 ? void 0 : _b.paymentImage).then((url) => {
                    sub.paymentDetails.paymentImage = url;
                }));
            }
        }
    }
    if ((_c = clone === null || clone === void 0 ? void 0 : clone.userId) === null || _c === void 0 ? void 0 : _c.profilePic) {
        promises.push(safeGetSignedUrl((_d = clone === null || clone === void 0 ? void 0 : clone.userId) === null || _d === void 0 ? void 0 : _d.profilePic).then((url) => {
            clone.userId.profilePic = url;
        }));
    }
    yield Promise.all(promises);
    return clone;
});
exports.generateSignedUrlsForDoctor = generateSignedUrlsForDoctor;
const generateSignedUrlsForUser = (user) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const clone = JSON.parse(JSON.stringify(user));
    const safeGetSignedUrl = (key) => __awaiter(void 0, void 0, void 0, function* () {
        if (!key || typeof key !== "string" || key.trim() === "")
            return key;
        try {
            return yield (0, upload_media_1.GetSignedUrl)(key);
        }
        catch (error) {
            console.warn("Could not generate signed URL for key:", key, error);
            return key;
        }
    });
    const promises = [];
    // Profile picture
    if (clone === null || clone === void 0 ? void 0 : clone.profilePic) {
        promises.push(safeGetSignedUrl(clone === null || clone === void 0 ? void 0 : clone.profilePic).then((url) => {
            clone.profilePic = url;
        }));
    }
    // Tax proof image
    if ((_a = clone === null || clone === void 0 ? void 0 : clone.taxProof) === null || _a === void 0 ? void 0 : _a.image) {
        promises.push(safeGetSignedUrl((_b = clone === null || clone === void 0 ? void 0 : clone.taxProof) === null || _b === void 0 ? void 0 : _b.image).then((url) => {
            clone.taxProof.image = url;
        }));
    }
    // Personal ID proof image
    if ((_c = clone === null || clone === void 0 ? void 0 : clone.personalIdProof) === null || _c === void 0 ? void 0 : _c.image) {
        promises.push(safeGetSignedUrl((_d = clone === null || clone === void 0 ? void 0 : clone.personalIdProof) === null || _d === void 0 ? void 0 : _d.image).then((url) => {
            clone.personalIdProof.image = url;
        }));
    }
    // Address proof image
    if ((_e = clone === null || clone === void 0 ? void 0 : clone.addressProof) === null || _e === void 0 ? void 0 : _e.image) {
        promises.push(safeGetSignedUrl((_f = clone === null || clone === void 0 ? void 0 : clone.addressProof) === null || _f === void 0 ? void 0 : _f.image).then((url) => {
            clone.addressProof.image = url;
        }));
    }
    // Bank details UPI QR image
    if ((_g = clone === null || clone === void 0 ? void 0 : clone.bankDetails) === null || _g === void 0 ? void 0 : _g.upiQrImage) {
        promises.push(safeGetSignedUrl((_h = clone === null || clone === void 0 ? void 0 : clone.bankDetails) === null || _h === void 0 ? void 0 : _h.upiQrImage).then((url) => {
            clone.bankDetails.upiQrImage = url;
        }));
    }
    // Doctor role ref
    if ((_j = clone === null || clone === void 0 ? void 0 : clone.roleRefs) === null || _j === void 0 ? void 0 : _j.doctor) {
        promises.push((0, exports.generateSignedUrlsForDoctor)((_k = clone === null || clone === void 0 ? void 0 : clone.roleRefs) === null || _k === void 0 ? void 0 : _k.doctor).then((urls) => {
            clone.roleRefs.doctor = urls;
        }));
    }
    yield Promise.all(promises);
    return clone;
});
exports.generateSignedUrlsForUser = generateSignedUrlsForUser;
const generateSignedUrlsForSubscription = (subscription) => __awaiter(void 0, void 0, void 0, function* () {
    const clone = JSON.parse(JSON.stringify(subscription));
    const safeGetSignedUrl = (key) => __awaiter(void 0, void 0, void 0, function* () {
        if (!key || typeof key !== "string" || key.trim() === "")
            return key;
        try {
            return yield (0, upload_media_1.GetSignedUrl)(key);
        }
        catch (error) {
            console.warn("Could not generate signed URL for key:", key, error);
            return key;
        }
    });
    // Generate signed URL for QR code image
    if (clone === null || clone === void 0 ? void 0 : clone.qrCodeImage) {
        clone.qrCodeImage = yield safeGetSignedUrl(clone === null || clone === void 0 ? void 0 : clone.qrCodeImage);
    }
    return clone;
});
exports.generateSignedUrlsForSubscription = generateSignedUrlsForSubscription;
const generateSignedUrlsForSubscriptions = (subscriptions) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(subscriptions)) {
        return subscriptions;
    }
    const signedSubscriptions = yield Promise.all(subscriptions.map((subscription) => (0, exports.generateSignedUrlsForSubscription)(subscription)));
    return signedSubscriptions;
});
exports.generateSignedUrlsForSubscriptions = generateSignedUrlsForSubscriptions;
const generateSignedUrlsForFamily = (family) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const clone = JSON.parse(JSON.stringify(family));
    const safeGetSignedUrl = (key) => __awaiter(void 0, void 0, void 0, function* () {
        if (!key || typeof key !== "string" || key.trim() === "")
            return key;
        try {
            return yield (0, upload_media_1.GetSignedUrl)(key);
        }
        catch (error) {
            console.warn("Could not generate signed URL for key:", key, error);
            return key;
        }
    });
    const promises = [];
    // ID image
    if ((_a = clone === null || clone === void 0 ? void 0 : clone.idProof) === null || _a === void 0 ? void 0 : _a.idImage) {
        promises.push(safeGetSignedUrl((_b = clone === null || clone === void 0 ? void 0 : clone.idProof) === null || _b === void 0 ? void 0 : _b.idImage).then((url) => {
            clone.idProof.idImage = url;
        }));
    }
    // Insurance images
    if (Array.isArray(clone === null || clone === void 0 ? void 0 : clone.insurance)) {
        clone.insurance.forEach((ins, index) => {
            if (ins === null || ins === void 0 ? void 0 : ins.image) {
                promises.push(safeGetSignedUrl(ins.image).then((url) => {
                    clone.insurance[index].image = url;
                }));
            }
        });
    }
    yield Promise.all(promises);
    return clone;
});
exports.generateSignedUrlsForFamily = generateSignedUrlsForFamily;
const generateSignedUrlsForFamilies = (families) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Array.isArray(families)) {
        return families;
    }
    const signedFamilies = yield Promise.all(families.map((family) => (0, exports.generateSignedUrlsForFamily)(family)));
    return signedFamilies;
});
exports.generateSignedUrlsForFamilies = generateSignedUrlsForFamilies;
