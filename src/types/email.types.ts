export type EmailAddress = { email: string; name?: string };

export type SendHtmlEmailInput = {
  to: string | EmailAddress | Array<string | EmailAddress>;
  subject: string;
  html: string;
  from?: EmailAddress;     // optional override
  replyTo?: EmailAddress;  // optional override
};