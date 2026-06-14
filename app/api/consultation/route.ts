import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/email';
import { medicalConsultationRequestTemplate } from '@/lib/email-templates';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, phone, specialty, date, preferredTime, symptoms } = body;

        if (!name || !phone || !specialty || !date) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Send email to admin
        await sendMail({
            to: process.env.ADMIN_EMAIL || 'service@healthmitraus.com',
            subject: `New Medical Consultation Request - ${specialty}`,
            html: medicalConsultationRequestTemplate({
                name,
                email: user.email,
                phone,
                specialty,
                date,
                preferredTime,
                symptoms
            })
        });

        // Also send acknowledgment to customer
        if (user.email) {
            await sendMail({
                to: user.email,
                subject: `Consultation Request Received - HealthMitra`,
                html: `<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                  <p>Dear ${name},</p>
                  <p>We have successfully received your request for a medical consultation (${specialty}) on ${date} at ${preferredTime}.</p>
                  <p>Our team will contact you shortly to confirm the appointment.</p>
                  <br/>
                  <p>Best regards,<br/><strong>HealthMitra Team</strong></p>
                </div>`
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Consultation API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to submit consultation request' }, { status: 500 });
    }
}
