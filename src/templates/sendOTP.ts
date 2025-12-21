import { sendHtmlEmail } from "../services/email.service";

export async function sendVerifyOtpEmail(params: {
  toEmail: string;
  toName: string;
  otp: string;
}) {
  const { toEmail, toName, otp } = params;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>Verify your email</h2>
      <p>Hi ${toName},</p>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing:4px">${otp}</h1>
      <p>This code expires soon. If you didn’t request this, ignore this email.</p>
    </div>
  `;

  await sendHtmlEmail({
    to: toEmail,
    subject: "Your verification code",
    html,
  });
}
