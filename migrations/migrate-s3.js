import dotenv from "dotenv";
import mongoose from "mongoose";
import {
  userFieldMap,
  emergencyAppointmentFieldMap,
  familyFieldMap,
  healthMetricsFieldMap,
  familyHealthMetricsFieldMap,
  doctorFieldMap,
} from "./mapping-config.js";
import {
  S3Client,
  CopyObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config();

const DRY_RUN = process.env.DRY_RUN === "true" || process.env.DRY_RUN === "1";

const BUCKET = process.env.AWS_STORAGE_BUCKET_NAME;
if (!BUCKET) {
  console.error("Missing AWS bucket name.");
  process.exit(1);
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_CONNECT_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION_NAME,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const getFilename = (key) => key.split("/").pop();
const ensureSlash = (p) => (p.endsWith("/") ? p : p + "/");

// copy images from old location to new location
async function s3Copy(oldKey, newKey) {
  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would copy ${oldKey} => ${newKey}`);
    return true;
  }

  // if source missing -> skip
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: oldKey }));
    console.log("hi")
  } catch (err) {
    console.warn(`Missing source object: ${oldKey}`);
    return false;
  }

  // if destination already exists -> skip copy
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: newKey }));
    console.log(`Destination exists, skipping copy: ${newKey}`);
    return true;
  } catch {
    // dest missing — proceed to copy
  }

  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${oldKey}`,
        Key: newKey,
      })
    );
    console.log(`Copied ${oldKey} → ${newKey}`);
    return true;
  } catch (err) {
    console.error(`Failed copy: ${oldKey} => ${newKey}`, err);
    return false;
  }
}

// get nested value using dot notation
function getNested(obj, path) {
  if (!obj) return undefined;
  return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}
// set nested value using dot notation
function setNested(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// helper to perform a targeted update (no validation)
async function updateDocField(Model, id, patchObj) {
  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would update ${Model.modelName} ${id} ->`, patchObj);
    return true;
  }
  try {
    await Model.updateOne({ _id: id }, { $set: patchObj }).exec();
    return true;
  } catch (err) {
    console.error(`Failed to update ${Model.modelName} ${id}`, err);
    return false;
  }
}

// user settings migration
async function migrateUsers(User) {
  console.log("\n=== Migrating Users ===");

  const cursor = User.find().cursor();
  for (let user = await cursor.next(); user; user = await cursor.next()) {
    try {
      const userId = user._id.toString();
      const patch = {}; // collect only changed fields

      for (const [field, resolver] of Object.entries(userFieldMap)) {
        if (field.includes("[]")) {
          const arrPath = field.split("[]")[0];
          const lastField = field.split("].")[1];

          const arr = getNested(user, arrPath);
          if (!Array.isArray(arr)) continue;

          for (let i = 0; i < arr.length; i++) {
            const oldKey = arr[i][lastField];
            if (!oldKey) continue;
            if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
              console.log(`Skipping external image: ${oldKey}`);
              continue;
            }

            const newPrefix = ensureSlash(resolver(user));
            if (oldKey.startsWith(newPrefix)) {
              // already in correct place
              continue;
            }

            const newKey = newPrefix + getFilename(oldKey);

            if (await s3Copy(oldKey, newKey)) {
              // set nested value in patch
              const fullPath = `${arrPath}${i}.${lastField}`; // e.g., insurance.0.imageProof
              patch[fullPath] = newKey;
            }
          }
        } else {
          const oldKey = getNested(user, field);
          if (!oldKey) continue;
          if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
            console.log(`Skipping external image: ${oldKey}`);
            continue;
          }

          const newPrefix = ensureSlash(resolver(user));
          if (oldKey.startsWith(newPrefix)) {
            continue;
          }

          const newKey = newPrefix + getFilename(oldKey);

          if (await s3Copy(oldKey, newKey)) {
            patch[field] = newKey;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await updateDocField(User, user._id, patch);
      }
    } catch (err) {
      console.error("Error processing user:", err);
      // continue to next user
    }
  }

  console.log("Completed Users\n");
}

// family migration
async function migrateFamily(Family, Patient) {
  console.log("\n=== Migrating Family Members ===");

  const cursor = Family.find().cursor();
  for (let fam = await cursor.next(); fam; fam = await cursor.next()) {
    try {
      const patient = await Patient.findById(fam.patientId).lean();
      if (!patient || !patient.userId) continue;

      const userId = patient.userId.toString();
      const familyId = fam._id.toString();
      const patch = {};

      for (const [field, resolver] of Object.entries(familyFieldMap)) {
        if (field.includes("[]")) {
          const arrPath = field.split("[]")[0];
          const lastField = field.split("].")[1];

          const arr = getNested(fam, arrPath);
          if (!Array.isArray(arr)) continue;

          for (let i = 0; i < arr.length; i++) {
            const oldKey = arr[i][lastField];
            if (!oldKey) continue;
            if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
              console.log(`Skipping external image: ${oldKey}`);
              continue;
            }

            const newPrefix = ensureSlash(resolver(userId, familyId));
            if (oldKey.startsWith(newPrefix)) continue;

            const newKey = newPrefix + getFilename(oldKey);

            if (await s3Copy(oldKey, newKey)) {
              const fullPath = `${arrPath}${i}.${lastField}`;
              patch[fullPath] = newKey;
            }
          }
        } else {
          const oldKey = getNested(fam, field);
          if (!oldKey) continue;
          if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
            console.log(`Skipping external image: ${oldKey}`);
            continue;
          }

          const newPrefix = ensureSlash(resolver(userId, familyId));
          if (oldKey.startsWith(newPrefix)) continue;

          const newKey = newPrefix + getFilename(oldKey);

          if (await s3Copy(oldKey, newKey)) {
            patch[field] = newKey;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await updateDocField(Family, fam._id, patch);
      }
    } catch (err) {
      console.error("Error processing family:", err);
    }
  }

  console.log(" Completed Family\n");
}

// emergency appointments migration
async function migrateEmergency(Emergency, Patient) {
  console.log("\n=== Migrating Emergency Appointments ===");

  const cursor = Emergency.find().cursor();
  for (let appt = await cursor.next(); appt; appt = await cursor.next()) {
    try {
      const patient = await Patient.findById(appt.patientId).lean();
      if (!patient || !patient.userId) continue;

      const userId = patient.userId.toString();

      const mediaArray = appt.media || [];
      const patch = {};
      for (let i = 0; i < mediaArray.length; i++) {
        const oldKey = mediaArray[i];
        if (!oldKey) continue;
        if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
          console.log(`Skipping external image: ${oldKey}`);
          continue;
        }

        const prefix = ensureSlash(
          emergencyAppointmentFieldMap["media[]"](userId)
        );

        if (oldKey.startsWith(prefix)) continue;

        const newKey = prefix + getFilename(oldKey);

        if (await s3Copy(oldKey, newKey)) {
          patch[`media.${i}`] = newKey;
        }
      }

      if (Object.keys(patch).length > 0) {
        await updateDocField(Emergency, appt._id, patch);
      }
    } catch (err) {
      console.error("Error processing emergency appt:", err);
    }
  }

  console.log("✔ Completed Emergency Appointments\n");
}

// health metrics migration
async function migrateHealthMetrics(HealthMetrics, Patient) {
  console.log("\n=== Migrating HealthMetrics ===");

  const cursor = HealthMetrics.find().cursor();
  for (let hm = await cursor.next(); hm; hm = await cursor.next()) {
    try {
      const patient = await Patient.findById(hm.patientId).lean();
      if (!patient || !patient.userId) continue;
      const userId = patient.userId.toString();
      if (!userId) continue;

      const patch = {};

      // patient-owned health metrics
      if (hm.ownerType === "Patient") {
        for (let i = 0; i < (hm.medicalHistory || []).length; i++) {
          const oldKey = hm.medicalHistory[i].reports;
          if (!oldKey) continue;
          if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
            console.log(`Skipping external report: ${oldKey}`);
            continue;
          }

          const prefix = ensureSlash(
            healthMetricsFieldMap["medicalHistory[].reports"](userId)
          );

          if (oldKey.startsWith(prefix)) continue;

          const newKey = prefix + getFilename(oldKey);

          if (await s3Copy(oldKey, newKey)) {
            patch[`medicalHistory.${i}.reports`] = newKey;
          }
        }
      }

      // family-owned
      if (hm.ownerType === "Family") {
        const familyId = hm.familyId?.toString();
        if (!familyId) {
          console.warn(
            `HealthMetrics ${hm._id} missing familyId but ownerType=Family`
          );
        } else {
          for (let i = 0; i < (hm.medicalHistory || []).length; i++) {
            const oldKey = hm.medicalHistory[i].reports;
            if (!oldKey) continue;
            if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
              console.log(`Skipping external report: ${oldKey}`);
              continue;
            }

            const prefix = ensureSlash(
              familyHealthMetricsFieldMap["medicalHistory[].reports"](
                userId,
                familyId
              )
            );

            if (oldKey.startsWith(prefix)) continue;

            const newKey = prefix + getFilename(oldKey);

            if (await s3Copy(oldKey, newKey)) {
              patch[`medicalHistory.${i}.reports`] = newKey;
            }
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await updateDocField(HealthMetrics, hm._id, patch);
      }
    } catch (err) {
      console.error("Error processing health metrics:", err);
    }
  }

  console.log("Completed HealthMetrics\n");
}

// doctor specific media migration
async function migrateDoctorMedia(Doctor) {
  console.log("\n=== Migrating Doctor Media ===");

  const cursor = Doctor.find().cursor();

  for (let doc = await cursor.next(); doc; doc = await cursor.next()) {
    try {
      const userId = doc.userId?.toString();
      if (!userId) {
        console.warn(`Doctor ${doc._id} has no userId — skipping`);
        continue;
      }

      const patch = {};

      for (const [field, resolver] of Object.entries(doctorFieldMap)) {
        if (field.includes("[]")) {
          const arrPath = field.split("[]")[0]; // e.g., "qualifications"
          const lastField = field.split("].")[1]; // e.g., "degreeImage"

          const arr = getNested(doc, arrPath);
          if (!Array.isArray(arr)) continue;

          for (let i = 0; i < arr.length; i++) {
            const oldKey = arr[i][lastField];
            if (!oldKey) continue;

            if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
              console.log(`Skipping external image: ${oldKey}`);
              continue;
            }

            const newPrefix = ensureSlash(resolver(userId));
            if (oldKey.startsWith(newPrefix)) continue;

            const newKey = newPrefix + getFilename(oldKey);

            if (await s3Copy(oldKey, newKey)) {
              patch[`${arrPath}${i}.${lastField}`] = newKey;
            }
          }
        } else {
          // SINGLE field like signatureImage
          const oldKey = getNested(doc, field);
          if (!oldKey) continue;

          if (oldKey.startsWith("http://") || oldKey.startsWith("https://")) {
            console.log(`Skipping external image: ${oldKey}`);
            continue;
          }

          const newPrefix = ensureSlash(resolver(userId));
          if (oldKey.startsWith(newPrefix)) continue;

          const newKey = newPrefix + getFilename(oldKey);

          if (await s3Copy(oldKey, newKey)) {
            patch[field] = newKey;
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await updateDocField(Doctor, doc._id, patch);
      }
    } catch (err) {
      console.error("Error processing doctor:", err);
    }
  }

  console.log("Completed Doctor Media\n");
}

(async () => {
  console.log("=== S3 Migration Started ===");
  console.log("DRY_RUN =", DRY_RUN, "\n");

  await connectDB();

  const User = (await import("../api/models/user/user-model.ts")).default;
  const Family = (await import("../api/models/user/family-model.ts")).default;
  const Patient = (await import("../api/models/user/patient-model.ts")).default;
  const Emergency = (
    await import("../api/models/appointment/emergency-appointment-model.ts")
  ).default;
  const HealthMetrics = (await import("../api/models/health-metrics-model.ts"))
    .default;
  const Doctor = (await import("../api/models/user/doctor-model.ts")).default;

  await migrateUsers(User);
  await migrateFamily(Family, Patient);
  await migrateEmergency(Emergency, Patient);
  await migrateHealthMetrics(HealthMetrics, Patient);
  await migrateDoctorMedia(Doctor);

  console.log("=== Migration Complete ===");
  await mongoose.disconnect();
  process.exit(0);
})();
