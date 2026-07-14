const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@maintainiq.com';

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
    console.log('✅ Nodemailer SMTP transporter initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Nodemailer transporter:', err.message);
  }
} else {
  console.log('💡 SMTP credentials missing. Email service will run in Console Log mode.');
}

/**
 * Helper to dispatch emails. If transporter setup is bypassed/fails, fallback to stdout.
 */
const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) return;

  const mailOptions = {
    from: SMTP_FROM,
    to,
    subject,
    text,
    html: html || text,
  };

  try {
    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`✉️  Email successfully sent to ${to} (Subject: "${subject}")`);
    } else {
      console.log(`[Email Console Fallback]
=========================================
TO:      ${to}
FROM:    ${SMTP_FROM}
SUBJECT: ${subject}
BODY:    ${text}
=========================================`);
    }
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
  }
};

/**
 * Trigger assignment notification to technician
 */
const sendAssignmentEmail = async (techEmail, techName, issueNumber, assetName, assetLocation, severity) => {
  const subject = `[MaintainIQ] 🔧 New Assignment: ${issueNumber}`;
  const text = `Hello ${techName},\n\nYou have been assigned to maintenance issue ${issueNumber} on MaintainIQ.\n\nAsset: ${assetName}\nLocation: ${assetLocation}\nPriority: ${severity}\n\nPlease inspect the asset and begin resolution details.\n\nBest regards,\nMaintainIQ Operations Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MaintainIQ</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Asset Maintenance Platform</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #333; margin-top: 0;">🔧 New Issue Assignment</h2>
        <p>Hello <strong>${techName}</strong>,</p>
        <p>You have been assigned to a new maintenance issue. Please review the details below and take appropriate action.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Issue Number:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${issueNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Asset:</td>
              <td style="padding: 8px 0; color: #333;">${assetName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0; color: #333;">${assetLocation}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="background: ${getPriorityColor(severity)}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">${severity}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="color: #666; font-size: 14px;">Please log in to your MaintainIQ dashboard to view full details and begin the resolution process.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/issues" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Issue Details</a>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          Best regards,<br>
          <strong>MaintainIQ Operations Team</strong><br>
          <em>This is an automated email. Please do not reply.</em>
        </p>
      </div>
    </div>
  `;
  
  await sendEmail({ to: techEmail, subject, text, html });
};

/**
 * Get priority color for email template
 */
const getPriorityColor = (priority) => {
  const colors = {
    'Low': '#28a745',
    'Medium': '#ffc107',
    'High': '#fd7e14',
    'Critical': '#dc3545'
  };
  return colors[priority] || '#6c757d';
};

/**
 * Trigger resolution notification to public reporter
 */
const sendResolutionEmail = async (reporterEmail, reporterName, issueNumber, assetName) => {
  const subject = `[MaintainIQ] ✅ Issue Resolved: ${issueNumber}`;
  const text = `Hello ${reporterName || 'User'},\n\nThe issue you reported (${issueNumber}) for asset "${assetName}" has been successfully resolved.\n\nThe asset is now verified operational. Thank you for reporting this issue.\n\nBest regards,\nMaintainIQ Operations Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">MaintainIQ</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Asset Maintenance Platform</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #333; margin-top: 0;">✅ Issue Resolved</h2>
        <p>Hello <strong>${reporterName || 'User'}</strong>,</p>
        <p>Great news! The issue you reported has been successfully resolved by our maintenance team.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Issue Number:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${issueNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Asset:</td>
              <td style="padding: 8px 0; color: #333;">${assetName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">✓ Resolved</span>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="color: #666; font-size: 14px;">The asset has been verified and is now fully operational. Thank you for helping us maintain a safe environment.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/issues/${issueNumber}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Issue Status</a>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
          Best regards,<br>
          <strong>MaintainIQ Operations Team</strong><br>
          <em>This is an automated email. Please do not reply.</em>
        </p>
      </div>
    </div>
  `;
  
  await sendEmail({ to: reporterEmail, subject, text, html });
};

module.exports = {
  sendEmail,
  sendAssignmentEmail,
  sendResolutionEmail,
};
