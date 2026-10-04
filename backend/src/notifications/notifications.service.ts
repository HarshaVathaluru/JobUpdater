import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface ApplicationSubmissionEmailData {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  location?: string;
  confirmationId: string;
  applicationUrl?: string;
  submittedAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private etherealAccount: any = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private async initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Mailer initialized using host ${host}`);
    } else {
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.etherealAccount = testAccount;
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.logger.log(`Using Ethereal Mailer for development/testing: ${testAccount.user}`);
      } catch (err) {
        this.logger.warn('Could not initialize Ethereal test account, using JSON fallback transporter', err);
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    }
  }

  async sendApplicationSubmissionConfirmation(data: ApplicationSubmissionEmailData): Promise<{ sent: boolean; messageId?: string; previewUrl?: string }> {
    if (!this.transporter) {
      await this.initTransporter();
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 24px; border-radius: 10px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Job Application Submitted Successfully!</h2>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Autonomous Recruitment Dispatch Confirmation</p>
        </div>
        
        <div style="padding: 24px 8px 12px 8px;">
          <p style="font-size: 15px; color: #334155;">Hello <strong>${data.candidateName || 'Candidate'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Your application for <strong>${data.jobTitle}</strong> at <strong>${data.company}</strong> has been confirmed and submitted through our recruitment gateway.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; color: #64748b; font-size: 13px; width: 38%;">Position</td>
              <td style="padding: 12px 16px; color: #0f172a; font-size: 14px; font-weight: 600;">${data.jobTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Company</td>
              <td style="padding: 12px 16px; color: #0f172a; font-size: 14px; font-weight: 600;">${data.company}</td>
            </tr>
            ${data.location ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Location</td>
              <td style="padding: 12px 16px; color: #0f172a; font-size: 14px;">${data.location}</td>
            </tr>` : ''}
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Gateway Reference</td>
              <td style="padding: 12px 16px; color: #059669; font-family: monospace; font-size: 14px; font-weight: 700;">${data.confirmationId}</td>
            </tr>
            <tr>
              <td style="padding: 12px 16px; color: #64748b; font-size: 13px;">Submitted Date</td>
              <td style="padding: 12px 16px; color: #0f172a; font-size: 13px;">${new Date(data.submittedAt).toLocaleString()}</td>
            </tr>
          </table>

          ${data.applicationUrl ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${data.applicationUrl}" target="_blank" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              View Job Listing
            </a>
          </div>
          ` : ''}

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
            <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
              <strong>Note:</strong> Corporate applicant tracking systems (e.g., Workday, Greenhouse, Lever, Ashby) will send candidate follow-up and interview invitations directly to your registered inbox: <strong>${data.candidateEmail}</strong>.
            </p>
          </div>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 28px; text-align: center;">
            This email was sent automatically by AutoApplyForJob.
          </p>
        </div>
      </div>
    `;

    try {
      const fromAddress = this.configService.get<string>('SMTP_FROM') || '"AutoApply Agent" <notifications@autoapplyforjob.com>';
      const info = await this.transporter!.sendMail({
        from: fromAddress,
        to: data.candidateEmail,
        subject: `Application Submitted: ${data.jobTitle} at ${data.company} [${data.confirmationId}]`,
        text: `Your application for ${data.jobTitle} at ${data.company} was submitted successfully! Confirmation ID: ${data.confirmationId}`,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      this.logger.log(`Submission confirmation email sent to ${data.candidateEmail}. Message ID: ${info.messageId}`);
      if (previewUrl) {
        this.logger.log(`Email Preview URL: ${previewUrl}`);
      }

      return { sent: true, messageId: info.messageId, previewUrl };
    } catch (err: any) {
      this.logger.error(`Failed to send submission email to ${data.candidateEmail}`, err.stack || err.message);
      return { sent: false };
    }
  }
}
