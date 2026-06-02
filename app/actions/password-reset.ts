"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email";
import crypto from "crypto";

const OTP_SECRET = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-reset-secret';

/**
 * Step 1: Send OTP to the user's email
 */
export async function requestPasswordResetOTP(email: string) {
    try {
        const adminClient = await createAdminClient();
        
        // 1. Check if user exists (can be email or HM- id)
        let targetEmail = email;
        let userId = null;

        if (!email.includes("@")) {
            // Lookup by HM- ID
            const { data: member } = await adminClient
                .from('ecard_members')
                .select('user_id')
                .eq('card_unique_id', email)
                .limit(1)
                .single();
            
            if (!member?.user_id) {
                return { success: false, error: 'User ID not found' };
            }
            userId = member.user_id;

            const { data: profile } = await adminClient
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();
            
            if (!profile?.email) {
                return { success: false, error: 'No email associated with this User ID' };
            }
            targetEmail = profile.email;
        } else {
            // Lookup by Email
            const { data: profile } = await adminClient
                .from('profiles')
                .select('id')
                .eq('email', email)
                .limit(1)
                .single();

            if (!profile?.id) {
                return { success: false, error: 'Email not found' };
            }
            userId = profile.id;
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 3. Create a verification hash (includes timestamp to expire in 10 mins)
        const expires = Date.now() + 10 * 60 * 1000;
        const dataToHash = `${userId}:${otp}:${expires}`;
        const hash = crypto.createHmac('sha256', OTP_SECRET).update(dataToHash).digest('hex');

        // 4. Send Email
        const emailResult = await sendMail({
            to: targetEmail,
            subject: 'HealthMitra - Password Reset OTP',
            devData: { 'OTP': otp, 'Email': targetEmail },
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #0891b2; text-align: center;">Password Reset Request</h2>
                    <p>We received a request to reset your password on HealthMitra.</p>
                    <p>Your One-Time Password (OTP) is:</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">${otp}</span>
                    </div>
                    <p>This code is valid for 10 minutes.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        if (!emailResult.success) {
            return { success: false, error: 'Failed to send OTP email. Please try again.' };
        }

        return { 
            success: true, 
            data: { 
                hash, 
                expires, 
                userId, 
                maskedEmail: targetEmail.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => { 
                    return gp2 + gp3.replace(/./g, '*'); 
                }) 
            } 
        };

    } catch (error: any) {
        console.error('Password Reset OTP Error:', error);
        return { success: false, error: 'An error occurred. Please try again.' };
    }
}

/**
 * Step 2: Verify OTP and update password
 */
export async function resetPasswordWithOTP(userId: string, newPassword: string, otp: string, hash: string, expires: number) {
    try {
        // 1. Check expiration
        if (Date.now() > expires) {
            return { success: false, error: 'OTP has expired. Please request a new one.' };
        }

        // 2. Verify Hash
        const dataToHash = `${userId}:${otp}:${expires}`;
        const computedHash = crypto.createHmac('sha256', OTP_SECRET).update(dataToHash).digest('hex');

        if (computedHash !== hash) {
            return { success: false, error: 'Invalid OTP' };
        }

        // 3. Update Password using Admin Client (bypasses RLS & current session)
        const adminClient = await createAdminClient();
        const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
            password: newPassword,
        });

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        return { success: true };

    } catch (error: any) {
        console.error('Password Reset Error:', error);
        return { success: false, error: 'An error occurred while resetting password.' };
    }
}
