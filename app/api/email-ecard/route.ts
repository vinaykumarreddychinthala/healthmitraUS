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

        const { recipients, cardName, htmlContent, memberId, cardImageBase64, cardFilename } = await request.json();

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

        // Build the final email body — embed card image inline if available
        const filename = cardFilename || `HealthMitra_Card_${cardName?.replace(/\s+/g, '_') || 'ecard'}.png`;
        const cid = 'ecard-image@healthmitra';

        const emailBody = cardImageBase64
            ? `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:30px 20px;">
    <tr><td align="center">
      <table width="660" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#113a40 0%,#1a5c66 100%);padding:28px 36px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">HealthMitra</h1>
            <p style="margin:8px 0 0;color:#a8d5db;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Your Health Insurance E-Card</p>
          </td>
        </tr>
        <!-- Greeting -->
        <tr>
          <td style="padding:28px 36px 12px;">
            <p style="margin:0;font-size:15px;color:#1a1a2e;">Dear <strong>${cardName}</strong>,</p>
            <p style="margin:12px 0 0;font-size:14px;color:#555;line-height:1.6;">
              Please find your HealthMitra E-Card attached below. You can <strong>download the image</strong> by right-clicking on the card or using the download button in your email client.
            </p>
          </td>
        </tr>
        <!-- Embedded card image -->
        <tr>
          <td style="padding:16px 36px;">
            <img src="cid:${cid}" alt="HealthMitra E-Card for ${cardName}" style="width:100%;max-width:588px;border-radius:14px;display:block;" />
          </td>
        </tr>
        <!-- Download hint -->
        <tr>
          <td style="padding:8px 36px 24px;">
            <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">
              💡 <strong>Tip:</strong> The card image is also attached as a file (<em>${filename}</em>) — open your email attachments to download and save it.
            </p>
          </td>
        </tr>
        <!-- Divider + Card HTML body -->
        <tr>
          <td style="padding:0 36px 24px;border-top:1px solid #f1f5f9;">
            ${htmlContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#113a40;padding:20px 36px;text-align:center;">
            <p style="margin:0;color:#a8d5db;font-size:12px;">
              For support: <a href="mailto:service@healthmitraus.com" style="color:#a8d5db;">service@healthmitraus.com</a> &nbsp;|&nbsp; (+91) 9818823106
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
            : htmlContent;

        // Build nodemailer attachments
        const attachments: any[] = [];
        if (cardImageBase64) {
            attachments.push({
                filename,
                content: cardImageBase64,
                encoding: 'base64',
                contentType: 'image/png',
                cid, // inline CID so img src="cid:..." renders in email
            });
        }

        // Send to all recipients
        const emailErrors: string[] = [];
        for (const recipient of recipients) {
            try {
                await sendMail({
                    to: recipient,
                    subject: `Your HealthMitra E-Card – ${cardName}`,
                    html: emailBody,
                    attachments,
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

