import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass
        }
      });
      this.isConfigured = true;
      console.log(`[EmailService] Configured with SMTP server: ${host}:${port}`);
    } else {
      this.isConfigured = false;
      console.log('[EmailService] SMTP credentials not set. Running in development console log mode.');
    }
  }



  /**
   * Send a password reset link
   */
  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;

    if (!this.isConfigured || !this.transporter) {
      console.log('\n================== PASSWORD RESET (DEV) ==================');
      console.log(`Recipient: ${name} <${to}>`);
      console.log(`Password Reset URL: ${resetUrl}`);
      console.log('==========================================================\n');
      return;
    }

    const from = process.env.EMAIL_FROM || 'Webthropic <no-reply@webthropic.com>';

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Reset your Webthropic password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 12px;">
          <h1 style="color: #38bdf8; margin-bottom: 16px;">Password Reset Request</h1>
          <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">Hi ${name},</p>
          <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">We received a request to reset your password. Click the button below to choose a new password:</p>
          <div style="margin: 32px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #94a3b8;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `
    });
  }
}

export const emailService = new EmailService();
