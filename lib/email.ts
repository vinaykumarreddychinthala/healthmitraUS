import nodemailer from 'nodemailer';

/**
 * Prints email details to the server terminal in non-production environments.
 * devData: pass explicit key→value pairs (e.g. Password, User ID) for guaranteed output
 * without relying on regex parsing of the HTML body.
 */
const logEmailToConsole = (
    to: string,
    subject: string,
    html: string,
    devData?: Record<string, string>,
) => {
    const line = '='.repeat(70);
    const dash = '─'.repeat(70);

    console.log('\n' + line);
    console.log(`📧  TO      : ${to}`);
    console.log(`📝  SUBJECT : ${subject}`);

    // 1. Print explicitly supplied credential data (100% reliable)
    if (devData && Object.keys(devData).length > 0) {
        console.log(dash);
        for (const [key, val] of Object.entries(devData)) {
            if (val) console.log(`    ${key.padEnd(14)}: ${val}`);
        }
    }

    // 2. Regex fallback — only runs when no devData supplied
    if (!devData) {
        const clean = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const otpMatch      = clean.match(/\b(\d{6})\b/);
        const userIdMatch   = clean.match(/\b(HM[A-Z0-9-]{3,})\b/i);
        const passwordMatch = clean.match(/Password\s*[:/]?\s*([^\s<]{4,})/i);

        if (otpMatch || userIdMatch || passwordMatch) {
            console.log(dash);
            if (otpMatch)       console.log(`🔑  OTP          : ${otpMatch[1]}`);
            if (userIdMatch)    console.log(`👤  USER ID      : ${userIdMatch[1]}`);
            if (passwordMatch)  console.log(`🔒  PASSWORD     : ${passwordMatch[1]}`);
        }
    }

    // 3. Body preview
    const clean = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const preview = clean.length > 300 ? clean.substring(0, 300) + '…' : clean;
    console.log(dash);
    console.log(`📄  BODY PREVIEW :\n    ${preview}`);
    console.log(line + '\n');
};

export const sendMail = async ({
    to,
    subject,
    html,
    devData,
}: {
    to: string;
    subject: string;
    html: string;
    /**
     * DEV ONLY — Pass credential key/value pairs here and they will be printed
     * directly in the terminal without any regex guessing.
     * Example: { 'User ID': 'HM-123456', Password: 'abc123!' }
     */
    devData?: Record<string, string>;
}) => {
    // Always log FIRST, before any SMTP attempt, so it always appears in terminal
    if (process.env.NODE_ENV !== 'production') {
        logEmailToConsole(to, subject, html, devData);
    }

    // If no SMTP configured, stop here (mock mode)
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return { success: true, info: 'mocked' };
    }

    // Attempt real SMTP send — failure does NOT suppress the log above
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"HealthMitra" <noreply@healthmitra.com>',
            to,
            subject,
            html,
        });

        console.log(`✅  Mail delivered: ${info.messageId}`);
        return { success: true, info };
    } catch (error) {
        console.error(`❌  SMTP send failed (credentials already logged above): ${(error as Error).message}`);
        return { success: true, info: 'smtp-failed-but-logged' };
    }
};
