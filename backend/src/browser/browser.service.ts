import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer-core';
import * as fs from 'fs';
import * as path from 'path';
import { CandidatePreferenceEntity } from '../candidate/entities/candidate-preference.entity';

export interface CandidateFormData {
  candidateId?: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  coverLetter?: string;
  portfolioUrl?: string;
  resumeFilePath?: string;
  password?: string;
  portalAccounts?: Record<string, { email?: string; username?: string; password?: string }>;
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

  constructor(
    @Optional()
    @InjectRepository(CandidatePreferenceEntity)
    private readonly prefRepo?: Repository<CandidatePreferenceEntity>,
  ) {}

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

  private readonly activeInteractiveBrowsers = new Map<string, puppeteer.Browser>();

  private cleanProfileLocks(candidateProfileDir: string) {
    const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'LOCK'];
    for (const lockFile of lockFiles) {
      try {
        const filePath = path.join(candidateProfileDir, lockFile);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log(`Cleaned stale lock file: ${filePath}`);
        }
      } catch (err: any) {
        this.logger.debug?.(`Lock file ${lockFile} in use or unremovable: ${err.message}`);
      }
    }
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
      const candidateProfileDir = candidate.candidateId
        ? path.resolve(process.cwd(), 'browser-profiles', candidate.candidateId)
        : path.resolve(process.cwd(), 'browser-profiles', 'default');
      if (!fs.existsSync(candidateProfileDir)) {
        fs.mkdirSync(candidateProfileDir, { recursive: true });
      }

      // Close interactive window if active so that profile lock is released
      if (candidate.candidateId && this.activeInteractiveBrowsers.has(candidate.candidateId)) {
        const interactiveBrowser = this.activeInteractiveBrowsers.get(candidate.candidateId);
        if (interactiveBrowser && interactiveBrowser.isConnected()) {
          logStep('INTERACTIVE_CLOSE', 'Closing active interactive session window so automated agent can use the profile...');
          await interactiveBrowser.close().catch(() => {});
          await new Promise((r) => setTimeout(r, 800));
        }
        this.activeInteractiveBrowsers.delete(candidate.candidateId);
      }

      this.cleanProfileLocks(candidateProfileDir);

      logStep('LAUNCH_BROWSER', `Initializing Chromium with persistent profile: ${candidateProfileDir}`);
      let launchError: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          browser = await puppeteer.launch({
            executablePath: this.getExecutablePath(),
            headless: 'new' as any,
            userDataDir: candidateProfileDir,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--window-size=1280,800',
            ],
          });
          launchError = null;
          break;
        } catch (err: any) {
          launchError = err;
          this.logger.warn(`Browser launch attempt ${attempt} failed: ${err.message}`);
          if (attempt === 1) {
            this.cleanProfileLocks(candidateProfileDir);
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }

      if (!browser && launchError) {
        const fallbackDir = path.resolve(process.cwd(), 'browser-profiles', `${candidate.candidateId || 'default'}-worker-${Date.now()}`);
        fs.mkdirSync(fallbackDir, { recursive: true });
        logStep('LAUNCH_FALLBACK', `Primary profile locked; continuing in isolated profile: ${fallbackDir}`);
        browser = await puppeteer.launch({
          executablePath: this.getExecutablePath(),
          headless: 'new' as any,
          userDataDir: fallbackDir,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1280,800',
          ],
        });
      }

      if (!browser) {
        throw launchError || new Error('Failed to launch Chromium browser.');
      }

      let page = await browser.newPage();
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

      // Check if an actual candidate application form is already visible
      const hasVisibleApplicationForm = await page.evaluate(() => {
        const visible = (element: Element) => (element as HTMLElement).getClientRects().length > 0;
        const forms = Array.from(document.querySelectorAll('form, [role="form"], [role="dialog"], .jobs-easy-apply-modal, .application-form, div[class*="application" i]')).filter(visible);
        return forms.some((form) => {
          const text = `${(form as HTMLElement).innerText || ''} ${form.getAttribute('aria-label') || ''}`.toLowerCase();
          const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map((i) => {
            const el = i as HTMLInputElement;
            return `${el.name} ${el.id} ${el.type} ${el.placeholder} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
          }).join(' ');
          const hasResume = !!form.querySelector('input[type="file"]') || /resume|cv|upload/i.test(inputs);
          const hasCandidateInfo = /first.?name|last.?name|full.?name|applicant|candidate|cover.?letter/i.test(`${text} ${inputs}`);
          return hasResume || hasCandidateInfo;
        });
      });

      // If no candidate form is visible yet, locate and click the Apply action
      if (!hasVisibleApplicationForm) {
        logStep('APPLY_ACTION_SEARCH', 'Scanning listing for employer Apply / Easy Apply action button or link...');

        const actionData = await page.evaluate(() => {
          const visible = (element: Element) => (element as HTMLElement).getClientRects().length > 0;

          const knownSelectors = [
            'button[data-modal="job-details-topcard-apply-modal"]',
            'button[data-modal*="apply" i]',
            'button[data-easy-apply-btn]',
            '.jobs-apply-button',
            'a[href*="externalApply"]',
            'a[data-tracking-control-name*="apply" i]',
            '[data-automation-id="applyButton"]',
            '[data-automation-id="adventureButton"]',
            'a.apply_btn',
            'button.apply_btn',
            'a[id*="apply" i]',
            'button[id*="apply" i]',
            'a.postings-btn',
            '#apply_button',
            '[data-qa="btn-apply"]',
            '[data-qa="apply-button"]',
            'button.btn-apply',
            'a.btn-apply',
            'button[aria-label*="apply" i]',
            'a[aria-label*="apply" i]',
          ];

          for (const sel of knownSelectors) {
            const el = document.querySelector(sel);
            if (el && visible(el)) {
              const marker = `autoapply-action-${Date.now()}-${Math.random().toString(36).slice(2)}`;
              el.setAttribute('data-autoapply-action', marker);
              const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || null;
              return { selector: `[data-autoapply-action="${marker}"]`, href, text: el.textContent?.trim() };
            }
          }

          const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]')).filter(visible);
          const matched = candidates.find((el) => {
            const text = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
            if (/apply filters|search/i.test(text)) return false;
            return /\b(apply|easy apply|apply now|apply for this job|apply on company website|apply to|start application|continue to apply)\b/i.test(text);
          });

          if (matched) {
            const marker = `autoapply-action-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            matched.setAttribute('data-autoapply-action', marker);
            const href = (matched as HTMLAnchorElement).href || matched.getAttribute('href') || null;
            return { selector: `[data-autoapply-action="${marker}"]`, href, text: matched.textContent?.trim() };
          }

          return null;
        });

        if (actionData?.selector) {
          logStep('APPLY_ACTION_FOUND', `Found application action: "${actionData.text || 'Apply'}". Opening employer application...`);

          const newTargetPromise = new Promise<puppeteer.Page | null>((resolve) => {
            const timer = setTimeout(() => resolve(null), 6000);
            const handler = async (target: puppeteer.Target) => {
              if (target.type() === 'page') {
                const p = await target.page();
                if (p) {
                  clearTimeout(timer);
                  browser?.off('targetcreated', handler);
                  resolve(p);
                }
              }
            };
            browser?.on('targetcreated', handler);
          });

          await page.click(actionData.selector).catch(() => {});
          const newPage = await newTargetPromise;

          if (newPage) {
            page = newPage;
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
            await new Promise((r) => setTimeout(r, 2000));
            logStep('EMPLOYER_PORTAL_OPENED', `Followed external application redirect to: ${page.url()}`);
          } else {
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      }

      // Check if page or modal requires candidate sign-in / registration
      let requiresLogin = await page.evaluate(() => {
        const text = document.body?.innerText?.toLowerCase() || '';
        const hasSignInForm = !!document.querySelector('form[data-id="sign-in-form"], .contextual-sign-in-modal, input[name="session_key"], input[name="session_password"]');
        const hasPasswordInput = Array.from(document.querySelectorAll('input[type="password"]')).some((input) => (input as HTMLElement).getClientRects().length > 0);
        return (
          hasSignInForm ||
          text.includes('sign in to find your next job') ||
          text.includes('sign in to apply') ||
          text.includes('create an account to apply') ||
          text.includes('log in to your account') ||
          hasPasswordInput
        );
      });

      if (requiresLogin) {
        logStep('LOGIN_CHECK', 'Portal prompted for authentication. Checking automated session/credentials...');

        // Resolve portal-specific credentials
        let activeEmail = candidate.email;
        let activePassword = candidate.password;

        if (candidate.portalAccounts) {
          const currentUrlLower = (page.url() || portalUrl).toLowerCase();
          for (const [key, acc] of Object.entries(candidate.portalAccounts)) {
            if (!acc) continue;
            const k = key.toLowerCase();
            if (
              currentUrlLower.includes(k) ||
              (k === 'linkedin' && currentUrlLower.includes('linkedin')) ||
              (k === 'shine' && currentUrlLower.includes('shine')) ||
              (k === 'indeed' && currentUrlLower.includes('indeed')) ||
              (k === 'naukri' && currentUrlLower.includes('naukri'))
            ) {
              if (acc.email || acc.username) activeEmail = acc.email || acc.username || activeEmail;
              if (acc.password) activePassword = acc.password;
              break;
            }
          }
          if (!activePassword && candidate.portalAccounts.universal?.password) {
            activePassword = candidate.portalAccounts.universal.password;
            if (candidate.portalAccounts.universal.email) {
              activeEmail = candidate.portalAccounts.universal.email;
            }
          }
        }

        const autofillRegistered = await page.evaluate((email, password) => {
          const emailInput = document.querySelector('input[name="session_key"], input[id="session_key"], input[type="email"], input[name*="email" i], input[id*="email" i], input[name*="user" i]') as HTMLInputElement;
          const passwordInput = document.querySelector('input[name="session_password"], input[id="session_password"], input[type="password"]') as HTMLInputElement;
          if (emailInput && passwordInput && password) {
            emailInput.value = email;
            passwordInput.value = password;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
            const submitBtn = document.querySelector('button[data-id="sign-in-form__submit-btn"], form[data-id="sign-in-form"] button[type="submit"], button[type="submit"], input[type="submit"]') as HTMLElement;
            if (submitBtn) {
              submitBtn.click();
              return true;
            }
          }
          return false;
        }, activeEmail, activePassword);

        if (autofillRegistered) {
          logStep('AUTO_AUTH_ATTEMPTED', 'Autofilled candidate credentials on sign-in form.');
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 2000));
          requiresLogin = await page.evaluate(() => {
            const text = document.body?.innerText?.toLowerCase() || '';
            return text.includes('sign in to find your next job') || text.includes('sign in to apply') || text.includes('create an account to apply');
          });
          if (!requiresLogin) {
            logStep('SESSION_ACTIVATED', 'Successfully authenticated! Session cookies saved to profile for automatic future applications.');
          }
        } else {
          logStep('LOGIN_REQUIRED', 'Portal requires candidate sign-in or saved session.');
        }
      }

      const applicationFormSelector = await page.evaluate(() => {
        const visible = (element: Element) => (element as HTMLElement).getClientRects().length > 0;
        const containers = Array.from(document.querySelectorAll('form, [role="form"], [role="dialog"], .jobs-easy-apply-modal, .application-form, div[id*="application" i], div[class*="application" i]')).filter(visible);
        const scored = containers.map((container) => {
          const text = `${(container as HTMLElement).innerText || ''} ${container.getAttribute('aria-label') || ''}`.toLowerCase();
          const fields = Array.from(container.querySelectorAll('input, textarea, select')).filter(visible);
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
          return { container, fields, score, hasApplicationSignal };
        }).filter((cand) => cand.fields.length > 0 && cand.hasApplicationSignal)
          .sort((a, b) => b.score - a.score);

        const selected = scored[0]?.container as HTMLElement | undefined;
        if (!selected) return null;
        const marker = `autoapply-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        selected.setAttribute('data-autoapply-form', marker);
        return `[data-autoapply-form="${marker}"]`;
      });

      const currentTitle = await page.title();
      const currentUrl = page.url();

      if (!applicationFormSelector) {
        let reason = 'Could not identify an employer application form. Open the listing and complete it manually.';
        if (requiresLogin) {
          reason = 'First-time registration or login required on this site. Log in once; your session is automatically saved to your candidate profile so next time you will apply automatically!';
        } else if (currentUrl !== portalUrl) {
          reason = 'Employer listing redirects to external career page. Open the link to review and finalize.';
        }
        logStep(requiresLogin ? 'LOGIN_REQUIRED' : 'APPLICATION_FORM_NOT_FOUND', reason);
        return {
          success: false,
          pageTitle: currentTitle || pageTitle,
          finalUrl: currentUrl || finalUrl,
          steps,
          detectedFields,
          filledFields,
          hasCaptcha: false,
          requiresUserAction: true,
          userActionReason: reason,
          confirmationDetected: false,
        };
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
          ? 'First-time registration or login required on this site. Log in once; your session is automatically saved to your candidate profile so next time you will apply automatically!'
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

  private async autofillSessionPage(page: puppeteer.Page, credentials?: { portalKey?: string; email?: string; password?: string }) {
    if (!credentials?.email && !credentials?.password) return false;
    this.logger.log(`Autofilling login credentials for portal ${credentials.portalKey || 'portal'} (User: ${credentials.email})`);

    // Give dynamic login pages (Shine, Naukri, LinkedIn) time to render inputs
    await new Promise((r) => setTimeout(r, 2000));

    try {
      const result = await page.evaluate((email, password) => {
        const userSelectors = [
          '#id_email_login', // Shine
          '#usernameField',  // Naukri
          '#username',       // LinkedIn
          '#session_key',    // LinkedIn alt
          'input[name="session_key"]',
          '#email',
          'input[name="email"]',
          'input[name="username"]',
          'input[type="email"]',
          'input[placeholder*="email" i]',
          'input[placeholder*="username" i]',
          'input[placeholder*="mobile" i]',
          'input[placeholder*="phone" i]',
          'input[name*="user" i]',
          'input[name*="login" i]',
          'input[id*="email" i]',
          'input[id*="login" i]',
          'input[id*="username" i]',
        ];

        let userEl: HTMLInputElement | null = null;
        for (const sel of userSelectors) {
          const el = document.querySelector(sel) as HTMLInputElement;
          if (el && (el.offsetWidth > 0 || el.getClientRects().length > 0)) {
            userEl = el;
            break;
          }
        }

        const passSelectors = [
          '#id_password',     // Shine
          '#passwordField',   // Naukri
          '#password',        // LinkedIn
          '#session_password',
          'input[name="session_password"]',
          'input[name="password"]',
          'input[type="password"]',
        ];

        let passEl: HTMLInputElement | null = null;
        for (const sel of passSelectors) {
          const el = document.querySelector(sel) as HTMLInputElement;
          if (el && (el.offsetWidth > 0 || el.getClientRects().length > 0)) {
            passEl = el;
            break;
          }
        }

        let filled = false;
        if (userEl && email) {
          userEl.focus();
          userEl.value = email;
          userEl.dispatchEvent(new Event('input', { bubbles: true }));
          userEl.dispatchEvent(new Event('change', { bubbles: true }));
          filled = true;
        }

        if (passEl && password) {
          passEl.focus();
          passEl.value = password;
          passEl.dispatchEvent(new Event('input', { bubbles: true }));
          passEl.dispatchEvent(new Event('change', { bubbles: true }));
          filled = true;
        }

        if (userEl && passEl && email && password) {
          const submitSelectors = [
            'button[type="submit"]',
            'button[data-id="sign-in-form__submit-btn"]',
            '.cls_login_btn',
            '.loginButton',
            'button.btn-primary',
            'input[type="submit"]',
            'form button',
          ];
          for (const sel of submitSelectors) {
            const btn = document.querySelector(sel) as HTMLElement;
            if (btn && (btn.offsetWidth > 0 || btn.getClientRects().length > 0)) {
              setTimeout(() => btn.click(), 400);
              break;
            }
          }
        }

        return filled;
      }, credentials.email || '', credentials.password || '');

      return result;
    } catch (e: any) {
      this.logger.warn(`Interactive autofill skipped: ${e.message}`);
      return false;
    }
  }

  async launchInteractiveSession(
    candidateId: string,
    targetUrl = 'https://www.linkedin.com/login',
    credentials?: { portalKey?: string; email?: string; password?: string },
  ) {
    try {
      // Save credentials into candidate preferences if provided
      if (this.prefRepo && credentials?.portalKey && (credentials.email || credentials.password)) {
        try {
          const pref = await this.prefRepo.findOne({ where: { userId: candidateId } });
          if (pref) {
            const existingAccounts = pref.portalAccounts || {};
            const keyLower = credentials.portalKey.toLowerCase().replace(/[^a-z]/g, '');
            existingAccounts[keyLower] = {
              email: credentials.email || existingAccounts[keyLower]?.email || '',
              password: credentials.password || existingAccounts[keyLower]?.password || '',
              linked: true,
              lastLinkedAt: new Date().toISOString(),
            };
            pref.portalAccounts = existingAccounts;
            await this.prefRepo.save(pref);
            this.logger.log(`Persisted portal account for ${keyLower} to candidate preferences.`);
          }
        } catch (dbErr: any) {
          this.logger.warn(`Could not update candidate preference portalAccount: ${dbErr.message}`);
        }
      }

      // If an interactive session is already open and connected, focus it and navigate
      if (this.activeInteractiveBrowsers.has(candidateId)) {
        const existing = this.activeInteractiveBrowsers.get(candidateId);
        if (existing && existing.isConnected()) {
          this.logger.log(`Focusing existing interactive browser session for candidate: ${candidateId}`);
          try {
            const pages = await existing.pages();
            const page = pages[0] || (await existing.newPage());
            await page.bringToFront().catch(() => {});
            if (targetUrl) {
              await page.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
              if (credentials?.email || credentials?.password) {
                await this.autofillSessionPage(page, credentials);
              }
            }
            return {
              status: true,
              message: `Opened ${credentials?.portalKey || 'portal'} login in your browser window and autofilled your credentials!`,
            };
          } catch (e: any) {
            this.logger.warn(`Error reusing interactive browser: ${e.message}. Launching fresh window.`);
            await existing.close().catch(() => {});
            this.activeInteractiveBrowsers.delete(candidateId);
          }
        } else {
          this.activeInteractiveBrowsers.delete(candidateId);
        }
      }

      const candidateProfileDir = candidateId
        ? path.resolve(process.cwd(), 'browser-profiles', candidateId)
        : path.resolve(process.cwd(), 'browser-profiles', 'default');
      if (!fs.existsSync(candidateProfileDir)) {
        fs.mkdirSync(candidateProfileDir, { recursive: true });
      }

      this.cleanProfileLocks(candidateProfileDir);

      this.logger.log(`Launching interactive browser window for candidate: ${candidateId} at ${targetUrl}`);
      let browser: puppeteer.Browser | null = null;
      try {
        browser = await puppeteer.launch({
          executablePath: this.getExecutablePath(),
          headless: false,
          userDataDir: candidateProfileDir,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850'],
        });
      } catch (launchErr: any) {
        this.logger.warn(`Interactive browser direct launch failed (${launchErr.message}), cleaning locks and retrying...`);
        this.cleanProfileLocks(candidateProfileDir);
        await new Promise((r) => setTimeout(r, 800));
        browser = await puppeteer.launch({
          executablePath: this.getExecutablePath(),
          headless: false,
          userDataDir: candidateProfileDir,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850'],
        });
      }

      this.activeInteractiveBrowsers.set(candidateId, browser);
      browser.on('disconnected', () => {
        this.logger.log(`Interactive browser closed for candidate: ${candidateId}`);
        this.activeInteractiveBrowsers.delete(candidateId);
      });

      const page = (await browser.pages())[0] || (await browser.newPage());
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

      if (credentials?.email || credentials?.password) {
        await this.autofillSessionPage(page, credentials);
      }

      return {
        status: true,
        message: `Interactive window opened on your screen with ${credentials?.portalKey || 'portal'} credentials autofilled! Cookies will be saved permanently.`,
      };
    } catch (err: any) {
      this.logger.error(`Failed to launch interactive session: ${err.message}`);
      return {
        status: false,
        message: `Could not launch desktop browser: ${err.message}`,
      };
    }
  }

  async checkSessionStatus(candidateId: string) {
    const candidateProfileDir = candidateId
      ? path.resolve(process.cwd(), 'browser-profiles', candidateId)
      : path.resolve(process.cwd(), 'browser-profiles', 'default');
    const exists = fs.existsSync(candidateProfileDir);
    let cookieCount = 0;
    if (exists) {
      try {
        const files = fs.readdirSync(candidateProfileDir);
        cookieCount = files.length;
      } catch {}
    }

    const linkedPortals: Record<string, boolean> = {
      linkedin: false,
      shine: false,
      indeed: false,
      naukri: false,
      universal: false,
    };

    if (this.prefRepo) {
      try {
        const pref = await this.prefRepo.findOne({ where: { userId: candidateId } });
        if (pref?.portalAccounts) {
          for (const [key, acc] of Object.entries(pref.portalAccounts)) {
            const k = key.toLowerCase();
            if (acc && (acc.email || acc.username || acc.password || acc.linked)) {
              linkedPortals[k] = true;
            }
          }
        }
      } catch {}
    }

    return {
      hasProfile: exists,
      hasSession: cookieCount > 2,
      profileDir: candidateProfileDir,
      linkedPortals,
    };
  }
}
