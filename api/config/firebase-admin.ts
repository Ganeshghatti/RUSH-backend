import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let firebaseInitialized = false;

export const initializeFirebaseAdmin = () => {
    if (firebaseInitialized) {
        return admin;
    }

    try {
        const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

        // Check if service account file exists
        if (!fs.existsSync(serviceAccountPath)) {
            throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
        }

        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });

        firebaseInitialized = true;
        console.log('Firebase Admin initialized successfully');
        return admin;
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        throw error;
    }
};

export const getFirebaseAdmin = () => {
    if (!firebaseInitialized) {
        return initializeFirebaseAdmin();
    }
    return admin;
};

export default admin;
