
export enum ServiceCategory {
  CYBERSECURITY = 'Cybersecurity',
  SOFTWARE_DEV = 'Software Development',
  AI_AUTOMATION = 'AI & Automation',
  WEB_DEV = 'Website Development',
  CONSULTATION = 'Consultation / Not Sure'
}

export type LeadType = 'High Intent' | 'Medium Intent' | 'Early Stage';

export interface LeadData {
  name: string;
  companyName: string;
  industry: string;
  serviceRequired: ServiceCategory | null;
  keyRequirements: string;
  employees: string;
  budgetRange: string;
  timeline: string;
  phone: string;
  email: string;
  preferredContactTime: string;
  hasExperiencedIncident?: string;
  infrastructureType?: string;
  currentSoftware?: string;
  userVolume?: string;
  needsWhatsApp?: boolean;
  needsVoice?: boolean;
}

export interface Message {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export enum Step {
  GREETING = 'GREETING',
  ID_REQUIREMENT = 'ID_REQUIREMENT',
  QUALIFICATION = 'QUALIFICATION',
  CONTACT_COLLECTION = 'CONTACT_COLLECTION',
  SUMMARY = 'SUMMARY'
}
