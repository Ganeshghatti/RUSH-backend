import { Request, Response } from "express";
import TokenModel from "../../models/TokenModel";
import User from "../../models/user/user-model";

export const saveToken = async (req: Request, res: Response) => {
    try {
        const { userId, role, token, deviceType } = req.body;

        console.log('📱 Received FCM token save request:', { userId, role, deviceType, tokenLength: token?.length });

        if (!token) {
            return res.status(400).json({ success: false, msg: "Token missing" });
        }

        // Save to TokenModel (for backward compatibility)
        await TokenModel.findOneAndUpdate(
            { token },
            { userId, role, deviceType },
            { upsert: true, new: true }
        );

        // Save to User model's fcmToken field (for emergency notifications)
        if (userId) {
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { fcmToken: token, deviceType },
                { new: true }
            );
            if (updatedUser) {
                console.log(`✅ FCM token saved for user ${userId} (${role})`);
            } else {
                console.log(`❌ User ${userId} not found, token not saved`);
            }
        } else {
            console.log('⚠️ No userId provided, token saved to TokenModel only');
        }

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Error saving FCM token:", err);
        res.status(500).json({ success: false });
    }
};
