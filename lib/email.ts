import nodemailer from 'nodemailer';

export const sendMail = async ({
    to,
    subject,
    html
}: {
    to: string;
    subject: string;
    html: string;
}) => {
    try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.log('\n================================================================');
            console.log(`📧 MOCK EMAIL SENT TO: ${to}`);
            console.log(`📝 SUBJECT: ${subject}`);
            console.log(`[Note: SMTP credentials are not configured in .env]`);
            
            // Try to extract OTP from HTML if it exists for easier development
            const otpMatch = html.match(/<span[^>]*>(\d{6})<\/span>/) || html.match(/>(\d{6})</);
            if (otpMatch) {
                console.log(`🔑 EXTRACTED OTP: ${otpMatch[1]}`);
            }
            console.log('================================================================\n');
            return { success: true, info: 'mocked' };
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: process.env.SMTP_FROM || '"HealthMitra" <noreply@healthmitra.com>',
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return { success: true, info };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error };
    }
};
