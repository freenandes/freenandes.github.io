/** About/CV types. Content lives in `src/cv.data.json` (regenerate via `npm run sync:linkedin`). */

import cvData from './cv.data.json';

export interface CVExperience {
  role: string;
  org: string;
  period: string;
  location?: string;
  summary?: string;
  points: string[];
}

export interface CVEntry {
  title: string;
  org?: string;
  period?: string;
  note?: string;
}

export interface CVSkillGroup {
  label: string;
  items: string[];
}

export interface CVContact {
  email?: string;
  phone?: string;
  linkedin?: string;
  website?: string;
  location?: string;
}

export interface CVConfig {
  name?: string;
  headline?: string;
  location?: string;
  summary: string;
  experience: CVExperience[];
  education: CVEntry[];
  skills: CVSkillGroup[];
  selectedClients: string[];
  recognition: CVEntry[];
  contact?: CVContact;
}

export const cv: CVConfig = cvData as CVConfig;
