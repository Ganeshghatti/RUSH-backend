import { GetSignedUrl } from "./aws_s3/upload-media";

export const generateSignedUrlsForDoctor = async (doctor: any) => {
  const clone = JSON.parse(JSON.stringify(doctor));

  const safeGetSignedUrl = async (key?: string) => {
    if (!key || typeof key !== "string" || key.trim() === "") return key;
    try {
      return await GetSignedUrl(key);
    } catch (error) {
      console.warn("Could not generate signed URL for key:", key, error);
      return key;
    }
  };

  const promises: Promise<void>[] = [];

  // Signature image
  promises.push(
    safeGetSignedUrl(clone.signatureImage).then((url) => {
      clone.signatureImage = url;
    })
  );

  // Qualifications
  if (Array?.isArray(clone?.qualifications)) {
    for (const qual of clone?.qualifications) {
      promises.push(
        safeGetSignedUrl(qual?.degreeImage).then((url) => {
          qual.degreeImage = url;
        })
      );
    }
  }

  // Registrations
  if (Array?.isArray(clone?.registration)) {
    for (const reg of clone?.registration) {
      promises.push(
        safeGetSignedUrl(reg?.licenseImage).then((url) => {
          reg.licenseImage = url;
        })
      );
    }
  }

  // Subscriptions
  if (Array?.isArray(clone?.subscriptions)) {
    for (const sub of clone?.subscriptions) {
      if (sub?.paymentDetails?.paymentImage) {
        promises.push(
          safeGetSignedUrl(sub?.paymentDetails?.paymentImage).then((url) => {
            sub.paymentDetails.paymentImage = url;
          })
        );
      }
    }
  }

  if (clone?.userId?.profilePic) {
    promises.push(
      safeGetSignedUrl(clone?.userId?.profilePic).then((url) => {
        clone.userId.profilePic = url;
      })
    );
  }

  await Promise.all(promises);
  return clone;
};

export const generateSignedUrlsForUser = async (user: any) => {
  const clone = JSON.parse(JSON.stringify(user));

  const safeGetSignedUrl = async (key?: string) => {
    if (!key || typeof key !== "string" || key.trim() === "") return key;
    try {
      return await GetSignedUrl(key);
    } catch (error) {
      console.warn("Could not generate signed URL for key:", key, error);
      return key;
    }
  };

  const promises: Promise<void>[] = [];

  // Profile picture
  if (clone?.profilePic) {
    promises.push(
      safeGetSignedUrl(clone?.profilePic).then((url) => {
        clone.profilePic = url;
      })
    );
  }

  // Tax proof image
  if (clone?.taxProof?.image) {
    promises.push(
      safeGetSignedUrl(clone?.taxProof?.image).then((url) => {
        clone.taxProof.image = url;
      })
    );
  }

  // Personal ID proof image
  if (clone?.personalIdProof?.image) {
    promises.push(
      safeGetSignedUrl(clone?.personalIdProof?.image).then((url) => {
        clone.personalIdProof.image = url;
      })
    );
  }

  // Address proof image
  if (clone?.addressProof?.image) {
    promises.push(
      safeGetSignedUrl(clone?.addressProof?.image).then((url) => {
        clone.addressProof.image = url;
      })
    );
  }

  // Bank details UPI QR image
  if (clone?.bankDetails?.upiQrImage) {
    promises.push(
      safeGetSignedUrl(clone?.bankDetails?.upiQrImage).then((url) => {
        clone.bankDetails.upiQrImage = url;
      })
    );
  }

  // Insurnace image
  if (
    Array.isArray(clone?.insuranceDetails) &&
    clone.insuranceDetails.length > 0
  ) {
    clone.insuranceDetails.forEach((insurance: any, index: number) => {
      if (insurance?.imageProof) {
        promises.push(
          safeGetSignedUrl(insurance.imageProof).then((url) => {
            clone.insuranceDetails[index].imageProof = url;
          })
        );
      }
    });
  }

  // Doctor role ref
  if (clone?.roleRefs?.doctor) {
    promises.push(
      generateSignedUrlsForDoctor(clone?.roleRefs?.doctor).then((urls) => {
        clone.roleRefs.doctor = urls;
      })
    );
  }

  await Promise.all(promises);
  return clone;
};

export const generateSignedUrlsForSubscription = async (subscription: any) => {
  const clone = JSON.parse(JSON.stringify(subscription));

  const safeGetSignedUrl = async (key?: string) => {
    if (!key || typeof key !== "string" || key.trim() === "") return key;
    try {
      return await GetSignedUrl(key);
    } catch (error) {
      console.warn("Could not generate signed URL for key:", key, error);
      return key;
    }
  };

  // Generate signed URL for QR code image
  if (clone?.qrCodeImage) {
    clone.qrCodeImage = await safeGetSignedUrl(clone?.qrCodeImage);
  }

  return clone;
};

export const generateSignedUrlsForSubscriptions = async (
  subscriptions: any[]
) => {
  if (!Array.isArray(subscriptions)) {
    return subscriptions;
  }

  const signedSubscriptions = await Promise.all(
    subscriptions.map((subscription) =>
      generateSignedUrlsForSubscription(subscription)
    )
  );

  return signedSubscriptions;
};

export const generateSignedUrlsForFamily = async (family: any) => {
  const clone = JSON.parse(JSON.stringify(family));

  const safeGetSignedUrl = async (key?: string) => {
    if (!key || typeof key !== "string" || key.trim() === "") return key;
    try {
      return await GetSignedUrl(key);
    } catch (error) {
      console.warn("Could not generate signed URL for key:", key, error);
      return key;
    }
  };

  const promises: Promise<void>[] = [];

  // ID image
  if (clone?.idProof?.idImage) {
    promises.push(
      safeGetSignedUrl(clone?.idProof?.idImage).then((url) => {
        clone.idProof.idImage = url;
      })
    );
  }

  // Insurance images
  if (Array.isArray(clone?.insurance)) {
    clone.insurance.forEach((ins: any, index: number) => {
      if (ins?.image) {
        promises.push(
          safeGetSignedUrl(ins.image).then((url) => {
            clone.insurance[index].image = url;
          })
        );
      }
    });
  }

  await Promise.all(promises);
  return clone;
};

export const generateSignedUrlsForFamilies = async (families: any[]) => {
  if (!Array.isArray(families)) {
    return families;
  }

  const signedFamilies = await Promise.all(
    families.map((family) => generateSignedUrlsForFamily(family))
  );

  return signedFamilies;
};
