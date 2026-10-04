import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import * as fs from 'fs';

export interface CandidateFormData {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeFilePath?: string;
}

export interface BrowserActionResult {
  success: boolean;
  pageTitle: string;
  finalUrl: string;
  steps: Array<{ step: string; detail: string; timestamp: string }>;
  detectedFields: Array<{ name: string; type: string; selector: string }>;
  filledFields: Array<{ field: string; value: string }>;
  hasCaptcha: boolean;
  requiresUserAction: boolean;
  userActionReason?: string;
  confirmationDetected: boolean;
  confirmationText?: string;
}

@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);

  private getExecutablePath(): string {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

    if (fs.existsSync(chromePath)) return chromePath;
    if (fs.existsSync(edgePath)) return edgePath;
    throw new Error('No compatible browser (Chrome or Edge) found on the host system.');
  }

  async inspectAndFillPortal(
    portalUrl: string,
    candidate: CandidateFormData,
    autoSubmit = false,
  ): Promise<BrowserActionResult> {
    const steps: Array<{ step: string; detail: string; timestamp: string }> = [];
    const detectedFields: Array<{ name: string; type: string; selector: string }> = [];
    const filledFields: Array<{ field: string; value: string }> = [];

    const logStep = (step: string, detail: string) => {
      this.logger.log(`[BrowserAgent] ${step}: ${detail}`);
      steps.push({ step, detail, timestamp: new Date().toISOString() });
    };

    let browser: puppeteer.Browser | null = null;

    try {
      logStep('LAUNCH_BROWSER', 'Initializing headless Chromium/Chrome instance...');
      browser = await puppeteer.launch({
        executablePath: this.getExecutablePath(),
        headless: 'new' as any,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1280,800',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      logStep('NAVIGATE_PORTAL', `Navigating to employer vacancy portal: ${portalUrl}`);
      await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait a moment for dynamic SPAs (Workday, Greenhouse, Lever, etc.)
      await new Promise((r) => setTimeout(r, 2000));

      const pageTitle = await page.title();
      const finalUrl = page.url();
      logStep('PORTAL_LOADED', `Page loaded: "${pageTitle}" at ${finalUrl}`);

      // Check for anti-bot / CAPTCHA
      const hasCaptcha = await page.evaluate(() => {
        const recaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]');
        const hcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
        const turnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
        return recaptcha || hcaptcha || turnstile;
      });

      if (hasCaptcha) {
        logStep('CAPTCHA_DETECTED', 'Company portal requires interactive human verification (CAPTCHA/Turnstile).');
        return {
          success: false,
          pageTitle,
          finalUrl,
          steps,
          detectedFields,
          filledFields,
          hasCaptcha: true,
          requiresUserAction: true,
          userActionReason: 'Portal requires interactive CAPTCHA verification.',
          confirmationDetected: false,
        };
      }

      // Check for employer login requirements (e.g., Workday candidate sign-in)
      const requiresLogin = await page.evaluate(() => {
        const text = document.body?.innerText?.toLowerCase() || '';
        return (
          text.includes('sign in to apply') ||
          text.includes('create an account to apply') ||
          text.includes('log in to your account')
        );
      });

      if (requiresLogin) {
        logStep('LOGIN_REQUIRED', 'Employer portal requires candidate authentication/account creation.');
      }

      // Inspect form inputs
      const domFields = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        return inputs.map((el) => {
          const input = el as HTMLInputElement;
          return {
            name: input.name || input.id || input.getAttribute('aria-label') || input.placeholder || '',
            type: input.type || el.tagName.toLowerCase(),
            selector: input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : '',
            placeholder: input.placeholder || '',
          };
        });
      });

      for (const f of domFields) {
        if (f.name || f.selector) {
          detectedFields.push({ name: f.name || f.type, type: f.type, selector: f.selector });
        }
      }
      logStep('FIELDS_DETECTED', `Found ${detectedFields.length} potential form fields on the company page.`);

      // Semantic Form Filling
      // 1. Candidate Email
      const emailFieldSelector = await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i], input[placeholder*="email" i]') as HTMLInputElement;
        return emailInput ? (emailInput.id ? `#${emailInput.id}` : emailInput.name ? `[name="${emailInput.name}"]` : 'input[type="email"]') : null;
      });

      if (emailFieldSelector && candidate.email) {
        try {
          await page.focus(emailFieldSelector);
          await page.$eval(emailFieldSelector, (el: any) => (el.value = ''));
          await page.type(emailFieldSelector, candidate.email, { delay: 30 });
          filledFields.push({ field: 'Email', value: candidate.email });
          logStep('FIELD_FILLED', `Populated candidate email: ${candidate.email} into company portal`);
        } catch (e: any) {
          this.logger.warn(`Could not fill email into ${emailFieldSelector}: ${e.message}`);
        }
      }

      // 2. Full Name / First Name / Last Name
      const nameFieldSelector = await page.evaluate(() => {
        const nameInput = document.querySelector('input[name*="name" i]:not([name*="first" i]):not([name*="last" i]), input[id*="name" i]:not([id*="first" i]):not([id*="last" i]), input[placeholder*="name" i]') as HTMLInputElement;
        return nameInput ? (nameInput.id ? `#${nameInput.id}` : `[name="${nameInput.name}"]`) : null;
      });

      if (nameFieldSelector && candidate.fullName) {
        try {
          await page.focus(nameFieldSelector);
          await page.type(nameFieldSelector, candidate.fullName, { delay: 20 });
          filledFields.push({ field: 'Full Name', value: candidate.fullName });
          logStep('FIELD_FILLED', `Populated candidate full name: ${candidate.fullName}`);
        } catch (e: any) {
          this.logger.warn(`Could not fill full name into ${nameFieldSelector}: ${e.message}`);
        }
      } else if (candidate.fullName) {
        // Try First Name & Last Name split
        const parts = candidate.fullName.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || parts[0];

        const firstNameSel = await page.evaluate(() => {
          const el = document.querySelector('input[name*="first" i], input[id*="first" i]') as HTMLInputElement;
          return el ? (el.id ? `#${el.id}` : `[name="${el.name}"]`) : null;
        });
        const lastNameSel = await page.evaluate(() => {
          const el = document.querySelector('input[name*="last" i], input[id*="last" i]') as HTMLInputElement;
          return el ? (el.id ? `#${el.id}` : `[name="${el.name}"]`) : null;
        });

        if (firstNameSel) {
          await page.type(firstNameSel, firstName);
          filledFields.push({ field: 'First Name', value: firstName });
          logStep('FIELD_FILLED', `Populated First Name: ${firstName}`);
        }
        if (lastNameSel) {
          await page.type(lastNameSel, lastName);
          filledFields.push({ field: 'Last Name', value: lastName });
          logStep('FIELD_FILLED', `Populated Last Name: ${lastName}`);
        }
      }

      // 3. Phone Number
      if (candidate.phone) {
        const phoneSel = await page.evaluate(() => {
          const el = document.querySelector('input[type="tel"], input[name*="phone" i], input[id*="phone" i]') as HTMLInputElement;
          return el ? (el.id ? `#${el.id}` : el.name ? `[name="${el.name}"]` : 'input[type="tel"]') : null;
        });
        if (phoneSel) {
          try {
            await page.type(phoneSel, candidate.phone, { delay: 20 });
            filledFields.push({ field: 'Phone', value: candidate.phone });
            logStep('FIELD_FILLED', `Populated phone: ${candidate.phone}`);
          } catch (e: any) {
            this.logger.warn(`Could not fill phone: ${e.message}`);
          }
        }
      }

      // 4. Resume File Upload
      if (candidate.resumeFilePath && fs.existsSync(candidate.resumeFilePath)) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          try {
            await fileInput.uploadFile(candidate.resumeFilePath);
            filledFields.push({ field: 'Resume File', value: candidate.resumeFilePath });
            logStep('FILE_UPLOADED', `Uploaded candidate resume document (${candidate.resumeFilePath}) to portal.`);
          } catch (e: any) {
            this.logger.warn(`Could not upload resume file: ${e.message}`);
          }
        }
      }

      // Check if submission is possible or requires user confirmation
      let confirmationDetected = false;
      let confirmationText: string | undefined;

      if (autoSubmit && filledFields.length > 0 && !requiresLogin) {
        const submitButtonSel = await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find((b) => {
            const t = (b.textContent || (b as HTMLInputElement).value || '').toLowerCase();
            return t.includes('submit application') || t.includes('apply now') || t.includes('send application');
          });
          return btn ? (btn.id ? `#${btn.id}` : 'button[type="submit"]') : null;
        });

        if (submitButtonSel) {
          logStep('SUBMIT_CLICKED', 'Submitting candidate application payload to company portal...');
          await Promise.all([
            page.click(submitButtonSel).catch(() => {}),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
          ]);

          // Check if page displays company confirmation
          const pageConfirmText = await page.evaluate(() => {
            const text = document.body?.innerText || '';
            const lower = text.toLowerCase();
            if (
              lower.includes('thank you for applying') ||
              lower.includes('application submitted') ||
              lower.includes('application received') ||
              lower.includes('we received your application')
            ) {
              return text.slice(0, 300);
            }
            return null;
          });

          if (pageConfirmText) {
            confirmationDetected = true;
            confirmationText = pageConfirmText;
            logStep('SUBMISSION_CONFIRMED', `Company portal confirmed application submission! "${pageConfirmText}"`);
          }
        }
      }

      const requiresUserAction = requiresLogin || filledFields.length === 0;

      return {
        success: filledFields.length > 0,
        pageTitle,
        finalUrl,
        steps,
        detectedFields,
        filledFields,
        hasCaptcha: false,
        requiresUserAction,
        userActionReason: requiresLogin
          ? 'Company portal requires direct candidate login/account.'
          : filledFields.length === 0
          ? 'No standard form inputs could be filled automatically on this portal.'
          : undefined,
        confirmationDetected,
        confirmationText,
      };
    } catch (error: any) {
      logStep('AGENT_ERROR', `Portal interaction error: ${error.message}`);
      return {
        success: false,
        pageTitle: '',
        finalUrl: portalUrl,
        steps,
        detectedFields,
        filledFields,
        hasCaptcha: false,
        requiresUserAction: true,
        userActionReason: error.message,
        confirmationDetected: false,
      };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
        logStep('CLOSE_BROWSER', 'Cleaned up browser session.');
      }
    }
  }
}
