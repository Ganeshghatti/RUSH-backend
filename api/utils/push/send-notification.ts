import { getFirebaseAdmin } from "../../config/firebase-admin";

interface PushPayload {
    token: string;
    title: string;
    body: string;
    data?: Record<string, any>;
}

export async function sendPushNotification({
    token,
    title,
    body,
    data = {},
}: PushPayload) {
    try {
        const admin = getFirebaseAdmin();

        // Convert data values to strings (FCM requirement)
        const stringData: Record<string, string> = {};
        Object.keys(data).forEach(key => {
            stringData[key] = String(data[key]);
        });

        const message = {
            token: token,
            notification: {
                title: title,
                body: body,
            },
            data: stringData,
            android: {
                priority: 'high' as const,
                notification: {
                    sound: 'default',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                    tag: 'emergency',
                    color: '#FF0000',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                    defaultLightSettings: true,
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        const response = await admin.messaging().send(message);
        console.log('Push notification sent successfully:', response);
        console.log('Notification details:', { title, body, token: token.substring(0, 20) + '...' });
        return { success: true, messageId: response };
    } catch (error) {
        console.error('Push send error:', error);
        throw error;
    }
}
