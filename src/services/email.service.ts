import sgMail, { type MailDataRequired } from "@sendgrid/mail";
import { SendHtmlEmailInput } from "../types/email.types";

let initialized = false;

export function initSendgrid() {
  if (initialized) return;

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("Missing env: SENDGRID_API_KEY");

  sgMail.setApiKey(apiKey);
  initialized = true;
}

function normalizeTo(to: SendHtmlEmailInput["to"]): MailDataRequired["to"] {
  const arr = Array.isArray(to) ? to : [to];
  return arr.map((t) => (typeof t === "string" ? { email: t } : t));
}

export async function sendHtmlEmail(input: SendHtmlEmailInput) {
  initSendgrid();

  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) throw new Error("Missing env: SENDGRID_FROM_EMAIL");

  const fromName = process.env.SENDGRID_FROM_NAME || "Go Thriftier";

  const msg: MailDataRequired = {
    to: normalizeTo(input.to),
    from: { email: fromEmail, name: fromName },
    replyTo: input.replyTo,
    subject: input.subject,
    content: [{ type: "text/html", value: input.html }],
  };

  await sgMail.send(msg);
}