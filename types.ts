
export enum Tab {
  Vacancies = 'Вакансии',
  Tasks = 'Задачи',
  Resumes = 'Резюме',
  Interviews = 'Интервью',
  AISourcer = 'AI-Сорсер',
}

export enum Priority {
  Urgent = 'Горит',
  High = 'Высокая',
  Medium = 'Средняя',
  Low = 'Невысокая',
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string; // Optional for guest users
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  linkedin?: string;
  other?: string;
}

export interface AnalysisResult {
  matchPercentage: number;
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  questionsForInterview: string[];
  contactInfo: ContactInfo;
}


export interface ResumeAnalysis {
  fileName: string;
  analysis: AnalysisResult | null;
  error?: string;
  isLoading: boolean;
}

export interface CandidateResume {
  id: string;
  fileName: string;
  fileUrl: string;
  analysis: AnalysisResult | null;
  isLoading: boolean;
  error?: string;
}

export interface Vacancy {
  id: string;
  title: string;
  priority: Priority;
  imageUrl: string;
  briefUrl: string;
  briefFileName: string;
  briefText: string; // Extracted text from PDF brief
  startDate: string; // ISO date string
  endDate?: string; // ISO date string
  resumes?: CandidateResume[];
  analysis?: { // AI analysis result
    summary:string;
    booleanQueries: string[];
  };
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  description: string;
  dueDate?: string; // ISO date string
  isCompleted: boolean;
}

export interface HiringManagerSummary {
  candidateName: string;
  age?: string;
  city?: string;
  salaryExpectations?: string;
  preferredPaymentFormat?: string;
  generalImpression: string;
  experienceSummary: string[];
  motivation: string;
  conclusion: string;
}

export interface SoftSkill {
  skill: string;
  rating: number; // 1-10
  justification: string;
}

export interface InterviewAnalysis {
  hiringManagerSummary: HiringManagerSummary;
  softSkillsAnalysis: SoftSkill[];
}