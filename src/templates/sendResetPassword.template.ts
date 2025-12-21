import { sendHtmlEmail } from "../services/email.service";

export async function sendResetPasswordEmail(params: {
  toEmail: string;
  toName: string;
  resetUrl: string;
}) {
  const { toEmail, toName, resetUrl } = params;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6">
      <h2>Reset your password</h2>
      <p>Hi ${toName},</p>
      <p>Click the button below to reset your password. This link expires soon.</p>
      <p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">
          Reset Password
        </a>
      </p>
      <p>If you didn’t request this, you can ignore this email.</p>
      <p style="word-break:break-all;color:#666">Or paste this link: ${resetUrl}</p>
    </div>
  `;

  await sendHtmlEmail({
    to: toEmail,
    subject: "Reset your password",
    html,
  });
}
