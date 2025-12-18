import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@thriftier.com";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface SendCredentialsEmailParams {
  toEmail: string;
  name: string;
  email: string;
  password: string;
  role: string;
}

/**
 * Send employee credentials email
 */
export const sendCredentialsEmail = async (params: SendCredentialsEmailParams) => {
  const { toEmail, name, email, password, role } = params;

  const roleLabel = role === "ADMIN" ? "Administrator" : "Driver";

  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: `Welcome to Thrifter - Your ${roleLabel} Account Credentials`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Thrifter</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 30px auto;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .credentials-box {
              background: #f8f9fa;
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 25px 0;
              border-radius: 5px;
            }
            .credential-item {
              margin: 12px 0;
              display: flex;
              align-items: center;
            }
            .credential-label {
              font-weight: 600;
              min-width: 100px;
              color: #555;
            }
            .credential-value {
              color: #333;
              font-family: 'Courier New', monospace;
              background: white;
              padding: 8px 12px;
              border-radius: 4px;
              border: 1px solid #ddd;
              flex: 1;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 25px 0;
              font-weight: 600;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Thrifter!</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Your ${roleLabel} Account is Ready</p>
            </div>
            
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              
              <p>Congratulations! Your ${roleLabel.toLowerCase()} account has been created successfully. Below are your login credentials:</p>
              
              <div class="credentials-box">
                <div class="credential-item">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${email}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Password:</span>
                  <span class="credential-value">${password}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Role:</span>
                  <span class="credential-value">${roleLabel}</span>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> For your security, please change your password after your first login. Keep your credentials confidential and never share them with anyone.
              </div>
              
              <div style="text-align: center;">
                <a href="${FRONTEND_URL}/login" class="button">Login to Dashboard</a>
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                If you have any questions or need assistance, please contact our support team.
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} Thrifter. All rights reserved.</p>
              <p style="margin: 5px 0;">This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to Thrifter!
      
      Hi ${name},
      
      Your ${roleLabel.toLowerCase()} account has been created successfully.
      
      Login Credentials:
      Email: ${email}
      Password: ${password}
      Role: ${roleLabel}
      
      Login URL: ${FRONTEND_URL}/login
      
      For security, please change your password after your first login.
      
      © ${new Date().getFullYear()} Thrifter. All rights reserved.
    `,
  };

  if (!SENDGRID_API_KEY) {
    console.log("⚠️ SendGrid API key not configured. Email would be sent:");
    console.log(msg);
    return { message: "Email service not configured" };
  }

  try {
    await sgMail.send(msg);
    console.log(`✅ Credentials email sent to ${toEmail}`);
    return { message: "Email sent successfully" };
  } catch (error: any) {
    console.error("❌ Error sending email:", error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error("Failed to send email");
  }
};

/**
 * Send order confirmation email to customer
 */
export const sendOrderConfirmationEmail = async (
  toEmail: string,
  orderDetails: any
) => {
  const msg = {
    to: toEmail,
    from: FROM_EMAIL,
    subject: `Order Confirmation - ${orderDetails.trackingNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Order Confirmed!</h2>
            <p>Your order has been received and is being processed.</p>
            <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Tracking Number:</strong> ${orderDetails.trackingNumber}</p>
              <p><strong>Pickup Date:</strong> ${new Date(orderDetails.pickupDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${orderDetails.status}</p>
            </div>
            <p>You can track your order status in your dashboard.</p>
            <p>Thank you for choosing Thrifter!</p>
          </div>
        </body>
      </html>
    `,
  };

  if (!SENDGRID_API_KEY) {
    console.log("⚠️ SendGrid API key not configured");
    return { message: "Email service not configured" };
  }

  try {
    await sgMail.send(msg);
    console.log(`✅ Order confirmation email sent to ${toEmail}`);
    return { message: "Email sent successfully" };
  } catch (error: any) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

/**
 * Send driver assignment notification
 */
export const sendDriverAssignmentEmail = async (
  driverEmail: string,
  orderDetails: any
) => {
  const msg = {
    to: driverEmail,
    from: FROM_EMAIL,
    subject: `New Order Assigned - ${orderDetails.trackingNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>New Order Assigned</h2>
            <p>You have been assigned a new delivery order.</p>
            <div style="background: #f4f4f4; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Tracking Number:</strong> ${orderDetails.trackingNumber}</p>
              <p><strong>Pickup Address:</strong> ${orderDetails.pickupAddress}, ${orderDetails.pickupCity}</p>
              <p><strong>Delivery Address:</strong> ${orderDetails.deliveryAddress}, ${orderDetails.deliveryCity}</p>
              <p><strong>Pickup Date:</strong> ${new Date(orderDetails.pickupDate).toLocaleDateString()}</p>
            </div>
            <p>Please log in to your dashboard to view complete order details.</p>
          </div>
        </body>
      </html>
    `,
  };

  if (!SENDGRID_API_KEY) {
    console.log("⚠️ SendGrid API key not configured");
    return { message: "Email service not configured" };
  }

  try {
    await sgMail.send(msg);
    console.log(`✅ Driver assignment email sent to ${driverEmail}`);
    return { message: "Email sent successfully" };
  } catch (error: any) {
    console.error("❌ Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

