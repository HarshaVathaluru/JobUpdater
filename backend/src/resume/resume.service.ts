import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResumeEntity } from './entities/resume.entity';
import { CandidateProfileEntity } from '../candidate/entities/candidate-profile.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly storagePath: string;

  constructor(
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
    @InjectRepository(CandidateProfileEntity)
    private readonly profileRepo: Repository<CandidateProfileEntity>,
    private readonly configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('gemini.apiKey') ||
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.storagePath = this.configService.get<string>('STORAGE_PATH') || './uploads';
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  async uploadMasterResume(userId: string, file: Express.Multer.File): Promise<ResumeEntity> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${fileId}${ext}`;
    const filePath = path.join(this.storagePath, filename);

    fs.writeFileSync(filePath, file.buffer);

    // Extract text defensively
    let extractedText = '';
    try {
      if (file.mimetype === 'application/pdf' || ext === '.pdf') {
        const parseFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any)?.default;
        if (typeof parseFn === 'function') {
          const data = await parseFn(file.buffer);
          extractedText = data.text || '';
        } else {
          extractedText = file.buffer.toString('utf-8');
        }
      } else if (
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ext === '.docx'
      ) {
        const data = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = data.value || '';
      } else {
        throw new BadRequestException('Unsupported file type. Please upload PDF or DOCX.');
      }
    } catch (error) {
      this.logger.error('Failed to extract text from file', error);
      throw new BadRequestException('Failed to extract text from file.');
    }

    // Structured extraction via Gemini with fallback
    const structuredData = await this.extractStructuredData(extractedText);

    // Save or update profile
    let profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.profileRepo.create({ id: uuidv4(), userId });
    }
    profile.fullName = structuredData.fullName || profile.fullName || file.originalname.replace(ext, '');
    profile.email = structuredData.email || profile.email || '';
    profile.phone = structuredData.phone || profile.phone || '';
    profile.location = structuredData.location || profile.location || '';
    profile.summary = structuredData.summary || profile.summary || '';
    profile.skills = Array.isArray(structuredData.skills) ? structuredData.skills : [];
    profile.experience = Array.isArray(structuredData.experience) ? structuredData.experience : [];
    profile.education = Array.isArray(structuredData.education) ? structuredData.education : [];
    profile.projects = Array.isArray(structuredData.projects) ? structuredData.projects : [];
    profile.certifications = Array.isArray(structuredData.certifications) ? structuredData.certifications : [];
    profile.achievements = Array.isArray(structuredData.achievements) ? structuredData.achievements : [];

    await this.profileRepo.save(profile);

    // Unmark old master resumes
    await this.resumeRepo.update({ userId, isMaster: true }, { isMaster: false });

    // Save resume
    const resume = this.resumeRepo.create({
      id: uuidv4(),
      userId,
      originalFilename: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      storagePath: filePath,
      extractedText,
      isMaster: true,
    });

    return this.resumeRepo.save(resume);
  }

  private async extractStructuredData(text: string): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const prompt = `
      Extract the following information from the resume text into a structured JSON object strictly:
      - fullName (string)
      - email (string)
      - phone (string)
      - location (string)
      - summary (string)
      - skills (array of strings)
      - experience (array of objects with keys: company, title, startDate, endDate, current (boolean), description, skills (array of strings))
      - education (array of objects with keys: institution, degree, field, startDate, endDate, gpa)
      - projects (array of objects with keys: name, description, technologies (array of strings), url)
      - certifications (array of objects with keys: name, issuer, date, expiryDate, url)
      - achievements (array of strings or objects with keys: title, description, issuer, date)

      Resume text:
      ${text.substring(0, 30000)}
      `;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const jsonText = response.text();
      return JSON.parse(jsonText);
    } catch (error) {
      this.logger.warn('Gemini extraction failed, using fallback heuristic parsing', error);
      return this.fallbackExtraction(text);
    }
  }

  private fallbackExtraction(text: string): any {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const fullName = lines.length > 0 ? lines[0] : 'Candidate';

    const getSection = (startRegex: RegExp, endRegex: RegExp) => {
      const sMatch = text.search(startRegex);
      if (sMatch === -1) return '';
      const sub = text.substring(sMatch);
      const headerMatch = sub.match(startRegex);
      if (!headerMatch) return '';
      const body = sub.substring(headerMatch[0].length);
      const eMatch = body.search(endRegex);
      return (eMatch !== -1 ? body.substring(0, eMatch) : body).trim();
    };

    const summaryRaw = getSection(/\n\s*(PROFESSIONAL SUMMARY|SUMMARY|OBJECTIVE)\s*\n/i, /\n\s*(EDUCATION|TECHNICAL SKILLS|SKILLS|EXPERIENCE)\s*\n/i);
    const summary = summaryRaw.split('\n').map(l => l.trim()).filter(Boolean).join(' ');

    const eduRaw = getSection(/\n\s*EDUCATION\s*\n/i, /\n\s*(TECHNICAL SKILLS|SKILLS|EXPERIENCE)\s*\n/i);
    const eduLines = eduRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const education: any[] = [];
    for (let i = 0; i < eduLines.length; i += 2) {
      const inst = eduLines[i];
      const detail = eduLines[i + 1] || '';
      if (inst) {
        education.push({
          institution: inst,
          degree: detail.split('|')[0]?.trim() || detail,
          field: detail.includes('in ') ? detail.split('in ')[1]?.split('|')[0]?.trim() : '',
          startDate: detail.match(/\d{4}\s*[–-]\s*\d{4}/)?.[0]?.split(/[–-]/)[0]?.trim() || '',
          endDate: detail.match(/\d{4}\s*[–-]\s*\d{4}/)?.[0]?.split(/[–-]/)[1]?.trim() || detail.match(/\d{4}/)?.[0] || '',
          gpa: detail.match(/CGPA:\s*([\d.]+)/i)?.[1] || '',
        });
      }
    }

    const skillsRaw = getSection(/\n\s*(TECHNICAL SKILLS|SKILLS)\s*\n/i, /\n\s*(EXPERIENCE|WORK EXPERIENCE|PROJECTS)\s*\n/i);
    const skillsLines = skillsRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const skills: string[] = [];
    for (const line of skillsLines) {
      const cleaned = line.replace(/^[A-Za-z\s&]+:\s*/, '').trim();
      const tokens = cleaned.split(/[,;|•]+/).map(s => s.trim()).filter(s => s.length > 1 && !s.includes(':'));
      for (const t of tokens) {
        if (!skills.includes(t)) skills.push(t);
      }
    }

    const expRaw = getSection(/\n\s*(EXPERIENCE|WORK EXPERIENCE)\s*\n/i, /\n\s*(PROJECTS|RESEARCH|ACHIEVEMENTS|CERTIFICATIONS)\s*\n/i);
    const expLines = expRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const experience: any[] = [];
    let curExp: any = null;
    for (const line of expLines) {
      if (line.includes('|') && (line.includes('Present') || line.match(/\d{4}/))) {
        if (curExp) experience.push(curExp);
        const [title, rest] = line.split('|').map(s => s.trim());
        const datesMatch = rest.match(/([A-Za-z]{3}\s*\d{4})\s*[–-]\s*(Present|[A-Za-z]{3}\s*\d{4})/i);
        const company = rest.replace(/([A-Za-z]{3}\s*\d{4})\s*[–-]\s*(Present|[A-Za-z]{3}\s*\d{4})/i, '').trim();
        curExp = {
          title: title || 'Software Engineer',
          company: company || rest,
          startDate: datesMatch ? datesMatch[1] : '',
          endDate: datesMatch ? datesMatch[2] : (rest.includes('Present') ? 'Present' : ''),
          current: rest.includes('Present'),
          description: '',
        };
      } else if (curExp) {
        const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
        curExp.description += (curExp.description ? ' ' : '') + cleanLine;
      }
    }
    if (curExp) experience.push(curExp);

    // Extract Projects in fallback
    const projRaw = getSection(/\n\s*PROJECTS\s*\n/i, /\n\s*(RESEARCH|ACHIEVEMENTS|CERTIFICATIONS|PUBLICATIONS)\s*\n/i);
    const projLines = projRaw.split('\n').map(l => l.trim()).filter(Boolean);
    const projects: any[] = [];
    let curProj: any = null;
    for (const line of projLines) {
      if (line.includes('|')) {
        if (curProj) projects.push(curProj);
        const [pName, pTech] = line.split('|').map(s => s.trim());
        curProj = {
          name: pName,
          description: '',
          technologies: pTech ? pTech.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : [],
        };
      } else if (curProj) {
        const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
        curProj.description += (curProj.description ? ' ' : '') + cleanLine;
      }
    }
    if (curProj) projects.push(curProj);

    // Extract Achievements in fallback
    const achRaw = getSection(/\n\s*(ACHIEVEMENTS|AWARDS)\s*\n/i, /\n\s*(CERTIFICATIONS|PUBLICATIONS|INTERESTS|$)\s*\n/i);
    const achLines = achRaw.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
    const achievements = achLines;

    // Extract Certifications in fallback
    const certRaw = getSection(/\n\s*CERTIFICATIONS\s*\n/i, /\n\s*(ACHIEVEMENTS|PUBLICATIONS|INTERESTS|$)\s*\n/i);
    const certLines = certRaw.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
    const certifications = certLines.map(c => ({ name: c, issuer: '' }));

    return {
      fullName,
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      location: text.includes('Andhra Pradesh, India') ? 'Andhra Pradesh, India' : '',
      summary: summary || lines.slice(1, 4).join(' '),
      skills,
      experience,
      education,
      projects,
      certifications,
      achievements,
    };
  }

  async getMasterResume(userId: string) {
    return this.resumeRepo.findOne({ where: { userId, isMaster: true } });
  }

  async getProfile(userId: string) {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) {
      return { message: 'Profile not found' };
    }
    return { profile };
  }
}
