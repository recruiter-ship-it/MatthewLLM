import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

// Added missing type definitions for the application
export enum Tab {
  Home = 'Главная',
  Vacancies = 'Вакансии',
  Resumes = 'Резюме',
  Interviews = 'Интервью',
  AISourcer = 'AI-Сорсер',
  AIAgent = 'AI Агент',
}

export enum Priority {
    Urgent = 'Горит',
    High = 'Высокий',
    Medium = 'Средний',
    Low = 'Низкий',
}

// New: Add VacancyStage enum
export enum VacancyStage {
    New = 'Новые',
    Sourcing = 'Сорсинг',
    Interview = 'Собеседования',
    Offer = 'Оффер',
    Archive = 'Архив',
}

export interface Recruiter {
  id: string;
  name: string;
  avatar: string;
}

export interface CompanyProfile extends Recruiter {
  email?: string;
  recruiters: Recruiter[];
}

export interface ContactInfo {
    email: string;
    phone: string;
    linkedin: string;
    other: string;
}

export interface AnalysisResult {
    matchPercentage: number;
    title: string;
    summary: string;
    pros: string[];
    cons: string[];
    redFlags?: string[];
    questionsForInterview: string[];
    contactInfo: ContactInfo;
}

// Fix: Added missing ResumeAnalysis type definition.
export interface ResumeAnalysis {
    fileName: string;
    analysis: AnalysisResult | null;
    isLoading: boolean;
    error?: string;
}

export interface CandidateResume {
    id: string;
    fileName: string;
    fileUrl: string;
    analysis: AnalysisResult | null;
    isLoading: boolean;
    error?: string;
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

export interface Competency {
    competency: string;
    rating: number;
    justification: string;
}

export interface InterviewAnalysis {
    hiringManagerSummary: HiringManagerSummary;
    competencyAnalysis: Competency[];
}

// Fix: Added missing MarketAnalysis type definition.
export interface MarketAnalysis {
  salaryRange: string;
  candidatePool: {
    location: string;
    count: string;
  };
  activeCompetitors: string[];
  talentDonors: string[];
}

export interface Vacancy {
    id: string;
    title: string;
    priority: Priority;
    stage: VacancyStage; // New field
    startDate: string;
    endDate?: string;
    imageUrl: string;
    briefUrl: string;
    briefFileName: string;
    briefText: string;
    recruiterId?: string;
    resumes?: CandidateResume[];
    analysis?: { summary: string; };
}

// Fix: Added missing Task, KanbanColumn, and KanbanSwimlane type definitions.
export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    dueDate?: string;
    columnId: string;
    swimlaneId: string;
}

export interface KanbanColumn {
    id: string;
    title: string;
}

export interface KanbanSwimlane {
    id: string;
    title: string;
}

// New types for Agent
export type AgentLogType = 'plan' | 'thought' | 'action' | 'observation' | 'error' | 'info';

export interface AgentLog {
    type: AgentLogType;
    message: string;
    timestamp: number;
    data?: any;
}

export interface AgentStep {
    id: number;
    description: string;

    status: 'pending' | 'running' | 'completed' | 'failed';
    error?: string;
}

// New types for personalized widgets
export interface WidgetLink {
  id: string;
  url: string;
  title: string;
  iconUrl: string;
  color?: string;
}