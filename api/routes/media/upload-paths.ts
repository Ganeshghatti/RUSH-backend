type PathFunction = (userId: string, familyId?: string) => string;

interface UploadPathMap {
  userProfilePic: (userId: string) => string;
  personalIdProof: (userId: string) => string;
  addressProof: (userId: string) => string;
  taxProof: (userId: string) => string;
  insuranceDetails: (userId: string) => string;
  bankingQR: (userId: string) => string;
  emergencyMedia: (userId: string) => string;
  familyIdProof: (userId: string, familyId: string) => string;
  familyInsurance: (userId: string, familyId: string) => string;
  healthMetricsPatient: (userId: string) => string;
  healthMetricsFamily: (userId: string, familyId: string) => string;
  doctorQualification: (userId: string) => string;
  doctorLicense: (userId: string) => string;
  doctorSignature: (userId: string) => string;
}

const uploadPathMap: UploadPathMap = {
  userProfilePic: (userId: string) => `${userId}/settings/profilePic/`,
  personalIdProof: (userId: string) => `${userId}/settings/identityProof/personalId/`,
  addressProof: (userId: string) => `${userId}/settings/identityProof/addressProof/`,
  taxProof: (userId: string) => `${userId}/settings/identityProof/taxProof/`,
  insuranceDetails: (userId: string) => `${userId}/settings/insuranceDetails/`,
  bankingQR: (userId: string) => `${userId}/settings/bankingDetails/`,

  emergencyMedia: (userId: string) => `${userId}/appointments/emergency/`,

  familyIdProof: (userId: string, familyId: string) => `${userId}/family/${familyId}/idProof/`,
  familyInsurance: (userId: string, familyId: string) => `${userId}/family/${familyId}/insurance/`,

  healthMetricsPatient: (userId: string) => `${userId}/healthMetrics/medicalHistory/`,
  healthMetricsFamily: (userId: string, familyId: string) =>
    `${userId}/family/${familyId}/healthMetrics/medicalHistory/`,

  doctorQualification: (userId: string) => `${userId}/doctor/qualification/`,
  doctorLicense: (userId: string) => `${userId}/doctor/license/`,
  doctorSignature: (userId: string) => `${userId}/doctor/signature/`,
};

export default uploadPathMap;
export type { UploadPathMap };
export type UploadPathType = keyof UploadPathMap;

