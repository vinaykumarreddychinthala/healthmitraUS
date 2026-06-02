const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const mailOptions = {
    from: process.env.SMTP_FROM || '"HealthMitra" <noreply@healthmitra.com>',
    to: 'testuser@healthmitraus.com',
    subject: 'SMTP Connection Test',
    html: '<p>Test email</p>',
};

console.log("Transporter config:", {
    host: transporter.options.host,
    port: transporter.options.port,
    secure: transporter.options.secure,
    user: transporter.options.auth.user
});

console.log("Sending test email...");
transporter.sendMail(mailOptions)
  .then(info => {
      console.log("Email sent successfully:", info.messageId);
  })
  .catch(err => {
      console.error("Error sending email:", err);
  });
