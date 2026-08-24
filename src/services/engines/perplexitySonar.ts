import { RawEngineResult, VisibilityEngine } from '../../types';

export class EngineDisabledError extends Error {
  constructor(engineName: string, reason: string) {
    super(`Engine '${engineName}' is disabled: ${reason}`);
    this.name = 'EngineDisabledError';
  }
}

export class PerplexitySonarEngine implements VisibilityEngine {
  readonly id = 'perplexity-sonar' as const;
  readonly label = 'Perplexity Sonar' as const;
  readonly supportsGrounding = true;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  setApiKey(key: string | null) {
    this.apiKey = key;
  }

  async run(prompt: string): Promise<RawEngineResult> {
    if (!this.apiKey) {
      throw new EngineDisabledError(
        'Perplexity Sonar',
        'API key is not configured in Settings. Gemini Grounded is the primary active engine.'
      );
    }

    try {
      const response = await fetch('/api/perplexity/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, apiKey: this.apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Perplexity API failed' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        engineId: 'perplexity-sonar',
        model: 'sonar',
        answerText: data.answerText || '',
        groundingSources: data.groundingSources || [],
        webSearchQueries: data.webSearchQueries || [],
        error: null,
      };
    } catch (err: any) {
      return {
        engineId: 'perplexity-sonar',
        model: 'sonar',
        answerText: '',
        groundingSources: [],
        webSearchQueries: [],
        error: err?.message || 'Perplexity Sonar execution failed',
      };
    }
  }
}

export const perplexitySonarEngine = new PerplexitySonarEngine();
