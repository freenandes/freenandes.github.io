/* =========================================================================
   CV / RÉSUMÉ CONTENT
   The About page renders from this data. It is generated from your LinkedIn
   profile PDF — drop a fresh export in `sources/linkedin-profile.pdf`, run
   `npm run sync:linkedin`, and `src/cv.data.json` (imported below) is rebuilt.

   The PDF always wins on a sync, so edit content on LinkedIn, not here. Tweak
   the *types* / page layout in this file and in `src/pages/about.astro`.
   See `scripts/sync-linkedin.mjs` and the "Sync from LinkedIn" section of the
   README for the full workflow.
   ========================================================================= */

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
  /** Full name, from the LinkedIn profile header. */
  name?: string;
  /** LinkedIn headline (the line under your name). */
  headline?: string;
  /** Location string, e.g. "Leiria, Portugal". */
  location?: string;
  summary: string;
  experience: CVExperience[];
  education: CVEntry[];
  skills: CVSkillGroup[];
  /** Distinct companies, derived from experience. */
  selectedClients: string[];
  recognition: CVEntry[];
  /** Parsed contact details (kept for reference; not auto-rendered). */
  contact?: CVContact;
}

export const cv: CVConfig = cvData as CVConfig;
