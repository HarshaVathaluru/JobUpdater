import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import * as fs from 'fs';

export interface CandidateFormData {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  coverLetter?: string;
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
  requiredFieldsRemaining?: string[];
}

@Injectable()
export class BrowserService {
  private readonly logger = new Logger(BrowserService.name);

  private getExecutablePath(): string {
    const candidates = [
      process.env.BROWSER_EXECUTABLE_PATH,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ].filter((candidate): candidate is string => Boolean(candidate));
    const executable = candidates.find((candidate) => fs.existsSync(candidate));
    if (executable) return executable;
    throw new Error('No supported browser executable found. Configure BROWSER_EXECUTABLE_PATH on the API host.');
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
          '--window-size=1280,800',
        ],
      });

      const page = await browser.newPage();
      logStep('NAVIGATE_PORTAL', `Navigating to employer vacancy portal: ${portalUrl}`);
      let navigationError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          navigationError = undefined;
          break;
        } catch (error: any) {
          navigationError = error;
          const transientNetworkError = /ERR_NETWORK_CHANGED|ERR_NETWORK_RESET|ERR_CONNECTION_RESET/i.test(String(error?.message || ''));
          if (!transientNetworkError || attempt === 3) break;
          logStep('NAVIGATION_RETRY', `Transient network interruption; retrying employer page (${attempt + 1}/3).`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
      if (navigationError) throw navigationError;

      // Give client-rendered ATS pages (including Ashby) time to hydrate.
      await new Promise((r) => setTimeout(r, 2500));

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
          text.includes('log in to your account') ||
          Array.from(document.querySelectorAll('form input[type="password"]')).some((input) => (input as HTMLElement).getClientRects().length > 0)
        );
      });

      if (requiresLogin) {
        logStep('LOGIN_REQUIRED', 'Employer portal requires candidate authentication/account creation.');
      }

      // Many ATS job pages hide the application fields until this button is
      // pressed. Opening that panel does not submit anything.
      const applicationActionSelector = await page.evaluate(() => {
        const visible = (element: Element) => (element as HTMLElement).getClientRects().length > 0;
        const hasVisibleApplicationFields = Array.from(document.querySelectorAll('form, [role="form"]')).some((form) =>
          visible(form) && !!form.querySelector('input, textarea, select'),
        );
        if (hasVisibleApplicationFields) return null;
        const actions = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter(visible);
        const applyAction = actions.find((element) => {
          const label = `${element.textContent || ''} ${element.getAttribute('aria-label') || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
          return /^(apply|apply for this job|apply now|start application)$/.test(label);
        }) as HTMLElement | undefined;
        if (!applyAction) return null;
        const marker = `autoapply-action-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        applyAction.setAttribute('data-autoapply-action', marker);
        return `[data-autoapply-action="${marker}"]`;
      });
      if (applicationActionSelector) {
        await Promise.all([
          page.click(applicationActionSelector).catch(() => {}),
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {}),
        ]);
        logStep('APPLICATION_PANEL_OPENED', 'Opened the employer application panel; no submission action was taken.');
        await new Promise((resolve) => setTimeout(resolve, 1800));
      }

      const applicationFormSelector = await page.evaluate(() => {
        const visible = (element: Element) => (element as HTMLElement).getClientRects().length > 0;
        const forms = Array.from(document.querySelectorAll('form, [role="form"]')).filter(visible);
        const scored = forms.map((form) => {
          const text = `${(form as HTMLElement).innerText || ''} ${form.getAttribute('aria-label') || ''}`.toLowerCase();
          const fields = Array.from(form.querySelectorAll('input, textarea, select')).filter(visible);
          const descriptors = fields.map((field) => {
            const element = field as HTMLInputElement;
            const labels = Array.from(element.labels || []).map((label) => label.innerText).join(' ');
            return `${element.type} ${element.name} ${element.id} ${element.placeholder} ${element.getAttribute('aria-label') || ''} ${labels}`.toLowerCase();
          }).join(' ');
          let score = 0;
          if (/apply|application|candidate|resume|cv/.test(`${text} ${descriptors}`)) score += 3;
          if (/email/.test(descriptors)) score += 2;
          if (/first.?name|last.?name|full.?name|your name/.test(descriptors)) score += 2;
          if (/resume|cv|upload|file/.test(descriptors)) score += 2;
          if (/phone|telephone|location|city|linkedin|cover.?letter/.test(descriptors)) score += 1;
          const hasApplicationSignal = /apply|application|candidate|resume|cv/.test(`${text} ${descriptors}`);
          return { form, fields, score, hasApplicationSignal };
        }).filter((candidate) => candidate.fields.length > 0 && candidate.hasApplicationSignal)
          .sort((a, b) => b.score - a.score);
        const selected = scored[0]?.form as HTMLElement | undefined;
        if (!selected) return null;
        const marker = `autoapply-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        selected.setAttribute('data-autoapply-form', marker);
        return `[data-autoapply-form="${marker}"]`;
      });
      if (!applicationFormSelector) {
        const reason = 'Could not identify an employer application form. Open the listing and complete it manually.';
        logStep('APPLICATION_FORM_NOT_FOUND', reason);
        return { success: false, pageTitle, finalUrl, steps, detectedFields, filledFields, hasCaptcha: false, requiresUserAction: true, userActionReason: reason, confirmationDetected: false };
      }

      // Inspect form inputs
      const domFields = await page.evaluate((formSelector) => {
        const inputs = Array.from(document.querySelector(`${formSelector}`)?.querySelectorAll('input, textarea, select') || []);
        return inputs.map((el) => {
          const input = el as HTMLInputElement;
          return {
            name: input.name || input.id || input.getAttribute('aria-label') || input.placeholder || '',
            type: input.type || el.tagName.toLowerCase(),
            selector: input.id ? `#${input.id}` : input.name ? `${formSelector} [name="${input.name}"]` : '',
            placeholder: input.placeholder || '',
          };
        });
      }, applicationFormSelector);

      for (const f of domFields) {
        if (f.name || f.selector) {
          detectedFields.push({ name: f.name || f.type, type: f.type, selector: f.selector });
        }
      }
      logStep('FIELDS_DETECTED', `Found ${detectedFields.length} potential form fields on the company page.`);

      // Semantic Form Filling
      // 1. Candidate Email
      const emailFieldSelector = await page.evaluate((formSelector) => {
        const emailInput = document.querySelector(`${formSelector} input[type="email"], ${formSelector} input[name*="email" i], ${formSelector} input[id*="email" i], ${formSelector} input[placeholder*="email" i]`) as HTMLInputElement;
        return emailInput ? (emailInput.id ? `#${emailInput.id}` : emailInput.name ? `${formSelector} [name="${emailInput.name}"]` : `${formSelector} input[type="email"]`) : null;
      }, applicationFormSelector);

      if (emailFieldSelector && candidate.email) {
        try {
          await page.focus(emailFieldSelector);
          await page.$eval(emailFieldSelector, (el: any) => (el.value = ''));
          await page.type(emailFieldSelector, candidate.email, { delay: 30 });
          filledFields.push({ field: 'Email', value: 'Candidate profile' });
          logStep('FIELD_FILLED', 'Populated candidate email from the saved profile.');
        } catch (e: any) {
          this.logger.warn(`Could not fill email into ${emailFieldSelector}: ${e.message}`);
        }
      }

      // 2. Full Name / First Name / Last Name
      const nameFieldSelector = await page.evaluate((formSelector) => {
        const nameInput = document.querySelector(`${formSelector} input[name*="name" i]:not([name*="first" i]):not([name*="last" i]), ${formSelector} input[id*="name" i]:not([id*="first" i]):not([id*="last" i]), ${formSelector} input[placeholder*="name" i]`) as HTMLInputElement;
        return nameInput ? (nameInput.id ? `#${nameInput.id}` : `${formSelector} [name="${nameInput.name}"]`) : null;
      }, applicationFormSelector);

      if (nameFieldSelector && candidate.fullName) {
        try {
          await page.focus(nameFieldSelector);
          await page.type(nameFieldSelector, candidate.fullName, { delay: 20 });
          filledFields.push({ field: 'Full Name', value: 'Candidate profile' });
          logStep('FIELD_FILLED', 'Populated the candidate name from the saved profile.');
        } catch (e: any) {
          this.logger.warn(`Could not fill full name into ${nameFieldSelector}: ${e.message}`);
        }
      } else if (candidate.fullName) {
        // Try First Name & Last Name split
        const parts = candidate.fullName.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ');

        const firstNameSel = await page.evaluate((formSelector) => {
          const el = document.querySelector(`${formSelector} input[name*="first" i], ${formSelector} input[id*="first" i]`) as HTMLInputElement;
          return el ? (el.id ? `#${el.id}` : `${formSelector} [name="${el.name}"]`) : null;
        }, applicationFormSelector);
        const lastNameSel = await page.evaluate((formSelector) => {
          const el = document.querySelector(`${formSelector} input[name*="last" i], ${formSelector} input[id*="last" i]`) as HTMLInputElement;
          return el ? (el.id ? `#${el.id}` : `${formSelector} [name="${el.name}"]`) : null;
        }, applicationFormSelector);

        if (firstNameSel) {
          await page.type(firstNameSel, firstName);
          filledFields.push({ field: 'First Name', value: 'Candidate profile' });
          logStep('FIELD_FILLED', 'Populated first name from the saved profile.');
        }
        if (lastNameSel) {
          if (lastName) {
            await page.type(lastNameSel, lastName);
            filledFields.push({ field: 'Last Name', value: 'Candidate profile' });
            logStep('FIELD_FILLED', 'Populated last name from the saved profile.');
          }
        }
      }

      // 3. Phone Number
      if (candidate.phone) {
        const phoneSel = await page.evaluate((formSelector) => {
          const el = document.querySelector(`${formSelector} input[type="tel"], ${formSelector} input[name*="phone" i], ${formSelector} input[id*="phone" i]`) as HTMLInputElement;
          return el ? (el.id ? `#${el.id}` : el.name ? `${formSelector} [name="${el.name}"]` : `${formSelector} input[type="tel"]`) : null;
        }, applicationFormSelector);
        if (phoneSel) {
          try {
            await page.type(phoneSel, candidate.phone, { delay: 20 });
            filledFields.push({ field: 'Phone', value: 'Candidate profile' });
            logStep('FIELD_FILLED', 'Populated phone from the saved profile.');
          } catch (e: any) {
            this.logger.warn(`Could not fill phone: ${e.message}`);
          }
        }
      }

      if (candidate.location) {
        const locationSelector = await page.evaluate((formSelector) => {
          const field = document.querySelector(`${formSelector} input[name*="location" i], ${formSelector} input[id*="location" i], ${formSelector} input[name*="city" i], ${formSelector} input[id*="city" i], ${formSelector} input[autocomplete="address-level2"]`) as HTMLInputElement;
          return field ? (field.id ? `#${field.id}` : field.name ? `${formSelector} [name="${field.name}"]` : null) : null;
        }, applicationFormSelector);
        if (locationSelector) {
          await page.type(locationSelector, candidate.location, { delay: 15 });
          filledFields.push({ field: 'Location', value: 'Candidate profile' });
          logStep('FIELD_FILLED', 'Populated the candidate location from the saved profile.');
        }
      }

      // 4. Resume File Upload
      if (candidate.resumeFilePath && fs.existsSync(candidate.resumeFilePath)) {
        const fileInput = await page.$(`${applicationFormSelector} input[type="file"][accept*="pdf" i], ${applicationFormSelector} input[type="file"][accept*="word" i], ${applicationFormSelector} input[type="file"][name*="resume" i], ${applicationFormSelector} input[type="file"][name*="cv" i]`);
        if (fileInput) {
          try {
            await fileInput.uploadFile(candidate.resumeFilePath);
            filledFields.push({ field: 'Resume File', value: 'Uploaded candidate resume' });
            logStep('FILE_UPLOADED', 'Uploaded the candidate resume file selected in their profile.');
          } catch (e: any) {
            this.logger.warn(`Could not upload resume file: ${e.message}`);
          }
        }
      }

      if (candidate.coverLetter) {
        const coverLetterSelector = await page.evaluate((formSelector) => {
          const fields = Array.from(document.querySelectorAll(`${formSelector} textarea, ${formSelector} input[type="text"]`)) as HTMLInputElement[];
          const field = fields.find((element) => {
            const labels = Array.from(element.labels || []).map((label) => label.innerText).join(' ');
            const description = `${element.name} ${element.id} ${element.placeholder} ${element.getAttribute('aria-label') || ''} ${labels}`.toLowerCase();
            return /cover[ -]?letter|motivation letter/.test(description);
          });
          if (!field) return null;
          if (!field.id) field.id = '__autoapply_cover_letter_field';
          return `#${field.id}`;
        }, applicationFormSelector);
        if (coverLetterSelector) {
          await page.$eval(coverLetterSelector, (element: any, value: string) => {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
          }, candidate.coverLetter);
          filledFields.push({ field: 'Cover Letter', value: 'Saved cover letter draft' });
          logStep('FIELD_FILLED', 'Inserted the candidate-reviewed saved cover letter draft.');
        }
      }

      const requiredFieldsRemaining = await page.evaluate((formSelector) => Array.from(document.querySelectorAll(`${formSelector} input[required], ${formSelector} textarea[required], ${formSelector} select[required]`))
        .filter((element) => {
          const control = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          if ((control as HTMLInputElement).disabled || control.getClientRects().length === 0) return false;
          if (control instanceof HTMLInputElement && ['checkbox', 'radio'].includes(control.type)) return !control.checked;
          if (control instanceof HTMLInputElement && control.type === 'file') return !control.files?.length;
          return !String(control.value || '').trim();
        })
        .map((element) => {
          const control = element as HTMLInputElement;
          const label = Array.from(control.labels || []).map((item) => item.innerText).join(' ').trim();
          return label || control.getAttribute('aria-label') || control.name || control.id || control.type || element.tagName.toLowerCase();
        }), applicationFormSelector) as string[];

      // Check if submission is possible or requires user confirmation
      let confirmationDetected = false;
      let confirmationText: string | undefined;

      if (autoSubmit && filledFields.length > 0 && !requiresLogin && requiredFieldsRemaining.length === 0) {
        const submitButtonSel = await page.evaluate((formSelector) => {
          const btn = Array.from(document.querySelectorAll(`${formSelector} button[type="submit"], ${formSelector} input[type="submit"]`)).find((b) => {
            const t = (b.textContent || (b as HTMLInputElement).value || '').toLowerCase().replace(/\s+/g, ' ').trim();
            return ['submit application', 'submit your application', 'send application'].includes(t);
          });
          if (!btn) return null;
          if (!btn.id) btn.id = '__autoapply_confirmed_submit_button';
          return `#${btn.id}`;
        }, applicationFormSelector);

        if (submitButtonSel) {
          const priorPageText = await page.evaluate(() => document.body?.innerText || '');
          logStep('SUBMIT_CLICKED', 'Submitting candidate application payload to company portal...');
          await Promise.all([
            page.click(submitButtonSel).catch(() => {}),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
          ]);

          // Check if page displays company confirmation
          const pageConfirmText = await page.evaluate((previousText) => {
            const text = document.body?.innerText || '';
            if (text.trim() === previousText.trim()) return null;
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
          }, priorPageText);

          if (pageConfirmText) {
            confirmationDetected = true;
            confirmationText = pageConfirmText;
            logStep('SUBMISSION_CONFIRMED', `Company portal confirmed application submission! "${pageConfirmText}"`);
          }
        }
      }

      const requiresUserAction = requiresLogin || filledFields.length === 0 || requiredFieldsRemaining.length > 0;

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
          : requiredFieldsRemaining.length > 0
          ? `Complete these required employer fields manually: ${requiredFieldsRemaining.join(', ')}.`
          : undefined,
        confirmationDetected,
        confirmationText,
        requiredFieldsRemaining,
      };
    } catch (error: any) {
      const rawMessage = String(error?.message || 'Unknown browser error');
      const userActionReason = /ERR_NETWORK_CHANGED|ERR_INTERNET_DISCONNECTED|ERR_NETWORK_RESET/i.test(rawMessage)
        ? 'The browser host lost or changed its network connection while opening the employer page. Open the listing in your browser and continue there.'
        : /ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|Navigation timeout/i.test(rawMessage)
        ? 'The employer page could not be reached from the browser host. Open the listing in your browser and continue there.'
        : 'The employer page could not be completed automatically. Open the listing in your browser and review it manually.';
      logStep('AGENT_ERROR', `Portal interaction failed: ${rawMessage}`);
      return {
        success: false,
        pageTitle: '',
        finalUrl: portalUrl,
        steps,
        detectedFields,
        filledFields,
        hasCaptcha: false,
        requiresUserAction: true,
        userActionReason,
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
