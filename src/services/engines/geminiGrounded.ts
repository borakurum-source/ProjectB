import { RawEngineResult, VisibilityEngine, GroundingSource } from '../../types';

export class GeminiGroundedEngine implements VisibilityEngine {
  readonly id = 'gemini-grounded' as const;
  readonly label = 'Gemini Grounded' as const;
  readonly supportsGrounding = true;

  async run(prompt: string): Promise<RawEngineResult> {
    try {
      const response = await fetch('/api/gemini/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown network error' }));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      // Transform raw grounding sources to typed GroundingSource
      const groundingSources: GroundingSource[] = (data.groundingSources || []).map((chunk: any) => ({
        displayTitle: chunk.displayTitle || chunk.title || 'Untitled Source',
        redirectUri: chunk.redirectUri || chunk.uri || '',
        resolvedDomain: chunk.resolvedDomain || null,
        supportedClaims: chunk.supportedClaims || [],
      }));

      return {
        engineId: 'gemini-grounded',
        model: data.model || 'gemini-3.6-flash',
        answerText: data.answerText || '',
        groundingSources,
        webSearchQueries: data.webSearchQueries || [],
        error: null,
      };
    } catch (err: any) {
      return {
        engineId: 'gemini-grounded',
        model: 'gemini-3.6-flash',
        answerText: '',
        groundingSources: [],
        webSearchQueries: [],
        error: err?.message || 'Gemini Grounded engine failed to produce answer',
      };
    }
  }
}

export const geminiGroundedEngine = new GeminiGroundedEngine();
