import { GetSignedUrl } from './aws_s3/upload-media';

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
    safeGetSignedUrl(clone.signatureImage).then(url => {
      clone.signatureImage = url;
    })
  );

  // Qualifications
  if (Array.isArray(clone.qualifications)) {
    for (const qual of clone.qualifications) {
      promises.push(
        safeGetSignedUrl(qual.degreeImage).then(url => {
          qual.degreeImage = url;
        })
      );
    }
  }

  // Registrations
  if (Array.isArray(clone.registration)) {
    for (const reg of clone.registration) {
      promises.push(
        safeGetSignedUrl(reg.licenseImage).then(url => {
          reg.licenseImage = url;
        })
      );
    }
  }

  // Subscriptions
  if (Array.isArray(clone.subscriptions)) {
    for (const sub of clone.subscriptions) {
      if (sub.paymentDetails?.paymentImage) {
        promises.push(
          safeGetSignedUrl(sub.paymentDetails.paymentImage).then(url => {
            sub.paymentDetails.paymentImage = url;
          })
        );
      }
    }
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

  if (clone.taxProof?.image) {
    promises.push(
      safeGetSignedUrl(clone.taxProof.image).then(url => {
        clone.taxProof.image = url;
      })
    );
  }

  if (clone.personalIdProof?.image) {
    promises.push(
      safeGetSignedUrl(clone.personalIdProof.image).then(url => {
        clone.personalIdProof.image = url;
      })
    );
  }

  if (clone.addressProof?.image) {
    promises.push(
      safeGetSignedUrl(clone.addressProof.image).then(url => {
        clone.addressProof.image = url;
      })
    );
  }

  if (clone.bankDetails?.upiQrImage) {
    promises.push(
      safeGetSignedUrl(clone.bankDetails.upiQrImage).then(url => {
        clone.bankDetails.upiQrImage = url;
      })
    );
  }

  // Doctor role ref
  if (clone?.roleRefs?.doctor) {
    promises.push(
      generateSignedUrlsForDoctor(clone.roleRefs.doctor).then(urls => {
        clone.roleRefs.doctor = urls;
      })
    );
  }

  await Promise.all(promises);
  return clone;
};