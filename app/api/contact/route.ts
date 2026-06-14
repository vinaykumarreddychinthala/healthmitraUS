import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/email';
import { contactUsNotificationTemplate } from '@/lib/email-templates';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, phone, subject, message, turnstileToken } = body;

        if (!name || !email || !message) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Verify CAPTCHA
        if (!turnstileToken) {
            return NextResponse.json({ success: false, error: 'Security verification failed. Please try again.' }, { status: 400 });
        }

        const isTurnstileValid = await verifyTurnstileToken(turnstileToken);
        if (!isTurnstileValid) {
            return NextResponse.json({ success: false, error: 'Security verification failed. Please refresh the page.' }, { status: 400 });
        }


        // Insert into database (using admin client to bypass RLS if not authenticated)
        const supabase = await createAdminClient();
        const { error: dbError } = await supabase.from('contact_messages').insert({
            name,
            email,
            phone: phone || null,
            subject: subject || 'General Inquiry',
            message,
            status: 'pending'
        });

        if (dbError) {
            console.error('Database error in contact form:', dbError);
        }

        // Send email to admin
        await sendMail({
            to: process.env.ADMIN_EMAIL || 'service@healthmitraus.com', // Admin email
            subject: `New Contact Request: ${subject || 'General Inquiry'}`,
            html: contactUsNotificationTemplate({
                name,
                email,
                phone,
                message
            })
        });

        // Also send an acknowledgment to the user
        await sendMail({
            to: email,
            subject: `We have received your query - HealthMitra`,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
              <p>Dear ${name},</p>
              <p>Thank you for getting in touch with us. We have received your query regarding "${subject || 'General Inquiry'}".</p>
              <p>Our team will get back to you within 24 hours.</p>
              <br/>
              <p>Best regards,<br/><strong>HealthMitra Team</strong></p>
            </div>`
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Contact API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to submit contact form' }, { status: 500 });
    }
}
