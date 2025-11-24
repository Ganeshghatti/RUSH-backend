// user setting media
export const userFieldMap = {
  profilePic: (user) => `${user._id}/settings/profilePic/`,
  "personalIdProof.image": (user) =>
    `${user._id}/settings/identityProof/personalId/`,
  "addressProof.image": (user) =>
    `${user._id}/settings/identityProof/addressProof/`,
  "taxProof.image": (user) => `${user._id}/settings/identityProof/taxProof/`,
  "bankDetails.upiQrImage": (user) => `${user._id}/settings/bankingDetails/`,
  // insuranceDetails is an array of objects with imageProof field
  "insuranceDetails[].imageProof": (user) =>
    `${user._id}/settings/insuranceDetails/`,
};

// emergency appointment media
export const emergencyAppointmentFieldMap = {
  // media[] contains list of s3 keys
  "media[]": (userId) => `${userId}/appointments/emergency/`,
};

// family model media
export const familyFieldMap = {
  "idProof.idImage": (userId, familyId) =>
    `${userId}/family/${familyId}/idProof/`,
  "insurance[].image": (userId, familyId) =>
    `${userId}/family/${familyId}/insurance/`,
};

// health metrics linked to family
export const familyHealthMetricsFieldMap = {
  "medicalHistory[].reports": (userId, familyId) =>
    `${userId}/family/${familyId}/healthMetrics/medicalHistory/`,
};

// healthMetrics linked to patient media
export const healthMetricsFieldMap = {
  "medicalHistory[].reports": (userId) =>
    `${userId}/healthMetrics/medicalHistory/`,
};

// doctor specific media
export const doctorFieldMap = {
  "qualifications[].degreeImage": (userId) =>
    `${userId}/doctor/qualifications/`,
  "registration[].licenseImage": (userId) => `${userId}/doctor/registrations/`,
  signatureImage: (userId) => `${userId}/doctor/signature/`,
};
