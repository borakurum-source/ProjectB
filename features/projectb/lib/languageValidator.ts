import { Client, Prompt } from '../types';

export interface LanguageDeviationItem {
  type: 'profile' | 'prompt';
  fieldNameOrId: string;
  label: string;
  snippet: string;
  detectedLanguage: string;
  expectedLanguage: string;
}

export interface LanguageValidationReport {
  targetLanguageLabel: string;
  targetLangCode: 'tr' | 'en' | 'de' | 'es' | 'fr' | 'other';
  isMatching: boolean;
  totalChecked: number;
  profileDeviationsCount: number;
  promptDeviationsCount: number;
  deviations: LanguageDeviationItem[];
}

/**
 * Normalizes client language specification into a standard language code and display label.
 */
export function normalizeClientLanguage(
  language?: string,
  market?: string,
  domain?: string
): { code: 'tr' | 'en' | 'de' | 'es' | 'fr' | 'other'; label: string } {
  const l = (language || '').toLowerCase().trim();
  const m = (market || '').toLowerCase().trim();
  const d = (domain || '').toLowerCase().trim();

  // Turkish
  if (
    l.includes('turk') ||
    l.includes('türk') ||
    l === 'tr' ||
    l.startsWith('tr-') ||
    l.includes('tr_') ||
    m.includes('turk') ||
    m.includes('türkiy') ||
    m.includes('istanbul') ||
    m.includes('ankara') ||
    m.includes('izmir') ||
    d.endsWith('.tr') ||
    d.includes('.tr/')
  ) {
    return { code: 'tr', label: 'Turkish (Türkçe)' };
  }

  // German
  if (l.includes('de') || l.includes('german') || l.includes('deutsch') || m.includes('germany') || d.endsWith('.de')) {
    return { code: 'de', label: 'German (Deutsch)' };
  }

  // Spanish
  if (l.includes('es') || l.includes('spanish') || l.includes('español') || m.includes('spain') || d.endsWith('.es')) {
    return { code: 'es', label: 'Spanish (Español)' };
  }

  // French
  if (l.includes('fr') || l.includes('french') || l.includes('français') || m.includes('france') || d.endsWith('.fr')) {
    return { code: 'fr', label: 'French (Français)' };
  }

  // English (default)
  return { code: 'en', label: 'English' };
}

/**
 * Validates whether a text snippet matches the target language.
 * Returns the detected language if it conflicts with target language, or null if it matches/neutral.
 */
export function detectLanguageConflict(
  text: string,
  targetLangCode: 'tr' | 'en' | 'de' | 'es' | 'fr' | 'other'
): string | null {
  if (!text || text.trim().length < 8) return null; // Ignore short labels or brand names

  const cleanText = text.trim();

  // Turkish target validation
  if (targetLangCode === 'tr') {
    // Check for explicit Turkish characters
    const hasTurkishChars = /[çğışöüÇĞİŞÖÜ]/.test(cleanText);
    // Check for common Turkish stop/structural words
    const hasTurkishWords = /\b(ve|için|ile|en|bir|bu|göre|olan|firmaları|fiyatları|nedir|nereden|nasıl|hakkında|en iyi|siparişi|kutusu|fiyatı|hizmetleri|türkiye|istanbul|ankara|izmir|kutu|parti|davet|etkinlik|organizasyon)\b/i.test(cleanText);

    if (hasTurkishChars || hasTurkishWords) {
      return null; // Matches Turkish
    }

    // Check for strong English markers when target is Turkish
    const englishWordMatches = cleanText.match(/\b(the|is|are|and|for|with|best|how|what|where|top|versus|vs|in|to|your|about|services|company|platform|solutions|of|on|at|by|from|which)\b/gi);
    if (englishWordMatches && englishWordMatches.length >= 2) {
      return 'English'; // Conflict: English content detected when target is Turkish
    }
  }

  // English target validation
  if (targetLangCode === 'en') {
    const hasTurkishChars = /[çğışöüÇĞİŞÖÜ]/.test(cleanText);
    const hasTurkishWords = /\b(ve|için|ile|en|bir|bu|göre|olan|firmaları|fiyatları|nedir|nereden|nasıl|hakkında|en iyi|siparişi|kutusu|fiyatı|hizmetleri|türkiye|istanbul)\b/i.test(cleanText);

    if (hasTurkishChars || hasTurkishWords) {
      return 'Turkish'; // Conflict: Turkish content detected when target is English
    }
  }

  return null; // Neutral / No conflict
}

/**
 * Validates all client brand profile fields and prompt texts against the designated client language.
 */
export function validateClientLanguage(client: Client, prompts: Prompt[] = []): LanguageValidationReport {
  const norm = normalizeClientLanguage(client.language, client.market, client.domain);
  const deviations: LanguageDeviationItem[] = [];

  const profileFieldsToCheck: Array<{ key: keyof Client; label: string }> = [
    { key: 'shortSummary', label: 'Short Summary' },
    { key: 'positioning', label: 'Positioning Statement' },
    { key: 'detailedDescription', label: 'Detailed Description' },
    { key: 'targetAudience', label: 'Target Audience' },
    { key: 'productsServices', label: 'Products & Services' },
    { key: 'keyDifferentiators', label: 'Key Differentiators' },
  ];

  let totalChecked = 0;

  // 1. Check Profile Fields
  for (const field of profileFieldsToCheck) {
    const val = client[field.key];
    if (typeof val === 'string' && val.trim().length > 0) {
      totalChecked++;
      const detectedConflict = detectLanguageConflict(val, norm.code);
      if (detectedConflict) {
        deviations.push({
          type: 'profile',
          fieldNameOrId: field.key as string,
          label: `Profile: ${field.label}`,
          snippet: val.length > 80 ? val.slice(0, 85) + '...' : val,
          detectedLanguage: detectedConflict,
          expectedLanguage: norm.label,
        });
      }
    }
  }

  // 2. Check Prompts for this Client
  const clientPrompts = prompts.filter((p) => p.clientId === client.id);
  for (const p of clientPrompts) {
    if (p.text && p.text.trim().length > 0) {
      totalChecked++;
      const detectedConflict = detectLanguageConflict(p.text, norm.code);
      if (detectedConflict) {
        deviations.push({
          type: 'prompt',
          fieldNameOrId: p.id,
          label: `Prompt: "${p.text.length > 50 ? p.text.slice(0, 50) + '...' : p.text}"`,
          snippet: p.text,
          detectedLanguage: detectedConflict,
          expectedLanguage: norm.label,
        });
      }
    }
  }

  const profileDeviationsCount = deviations.filter((d) => d.type === 'profile').length;
  const promptDeviationsCount = deviations.filter((d) => d.type === 'prompt').length;

  return {
    targetLanguageLabel: norm.label,
    targetLangCode: norm.code,
    isMatching: deviations.length === 0,
    totalChecked,
    profileDeviationsCount,
    promptDeviationsCount,
    deviations,
  };
}

