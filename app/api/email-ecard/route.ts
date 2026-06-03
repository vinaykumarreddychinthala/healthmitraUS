import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        // Auth guard: only authenticated users can email their own cards
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { recipients, cardName, htmlContent, memberId } = await request.json();

        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return NextResponse.json({ success: false, error: 'No recipients provided.' }, { status: 400 });
        }

        if (!htmlContent) {
            return NextResponse.json({ success: false, error: 'No card content provided.' }, { status: 400 });
        }

        // IDOR: verify the member belongs to the requesting user
        if (memberId) {
            const { data: member } = await supabase
                .from('ecard_members')
                .select('id, user_id')
                .eq('id', memberId)
                .eq('user_id', user.id)
                .single();

            if (!member) {
                return NextResponse.json({ success: false, error: 'Member not found or access denied.' }, { status: 403 });
            }
        }

        // Send to all recipients
        const emailErrors: string[] = [];
        for (const recipient of recipients) {
            try {
                await sendMail({
                    to: recipient,
                    subject: `Your HealthMitra E-Card – ${cardName}`,
                    html: htmlContent,
                });
            } catch (mailErr: any) {
                console.error(`Failed to send to ${recipient}:`, mailErr);
                emailErrors.push(recipient);
            }
        }

        if (emailErrors.length > 0 && emailErrors.length === recipients.length) {
            return NextResponse.json({
                success: false,
                error: `Failed to send to all recipients. Check SMTP configuration.`,
            }, { status: 500 });
        }

        const successCount = recipients.length - emailErrors.length;
        return NextResponse.json({
            success: true,
            message: `E-Card sent to ${successCount} recipient(s) successfully.`,
            ...(emailErrors.length > 0 && { partialFailures: emailErrors }),
        });

    } catch (error: any) {
        console.error('Email ecard API error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to send e-card email.',
        }, { status: 500 });
    }
}
