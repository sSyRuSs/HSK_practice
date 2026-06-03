/**
 * API client utilities for frontend components
 */

import type { VocabWord } from '@/data/hsk-vocabulary';

const API_BASE = '/api';

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Helper function to handle fetch responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(
      error.error || `HTTP ${response.status}`,
      response.status,
      error
    );
  }
  return response.json();
}

// Vocabulary API
export interface VocabularyResponse {
  words: VocabWord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  cached?: boolean;
}

export async function fetchVocabulary(params?: {
  level?: number;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<VocabularyResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.level) searchParams.set('level', params.level.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  if (params?.search) searchParams.set('search', params.search);

  const url = `${API_BASE}/vocabulary?${searchParams.toString()}`;
  const response = await fetch(url);
  return handleResponse<VocabularyResponse>(response);
}

// Word Details API
export interface WordDetailsResponse extends VocabWord {
  examples?: Array<{
    chinese: string;
    pinyin: string;
    english: string;
    source?: string;
  }>;
  synonyms?: string[];
  audioUrl?: string;
  strokeOrder?: any;
  cached?: boolean;
}

export async function fetchWordDetails(id: string): Promise<WordDetailsResponse> {
  const url = `${API_BASE}/word/${id}`;
  const response = await fetch(url);
  return handleResponse<WordDetailsResponse>(response);
}

// Audio API
export interface AudioResponse {
  text: string;
  lang: string;
  method: 'client-side' | 'server-side';
  audioUrl?: string;
  duration?: number;
  format?: string;
  cached?: boolean;
}

export async function fetchAudioInfo(text: string, lang = 'zh-CN'): Promise<AudioResponse> {
  const searchParams = new URLSearchParams({ text, lang });
  const url = `${API_BASE}/audio?${searchParams.toString()}`;
  const response = await fetch(url);
  return handleResponse<AudioResponse>(response);
}

export async function fetchBulkAudioInfo(
  texts: string[],
  lang = 'zh-CN'
): Promise<{ results: AudioResponse[]; count: number }> {
  const url = `${API_BASE}/audio`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, lang }),
  });
  return handleResponse(response);
}

// Stroke Order API
export interface StrokeOrderResponse {
  character: string;
  strokes?: any[];
  medians?: any[];
  radicals?: any[];
  available: boolean;
  source: string;
  cached?: boolean;
}

export async function fetchStrokeOrder(character: string): Promise<StrokeOrderResponse> {
  const url = `${API_BASE}/strokes/${encodeURIComponent(character)}`;
  const response = await fetch(url);
  return handleResponse<StrokeOrderResponse>(response);
}

// Examples API
export interface ExampleSentence {
  chinese: string;
  pinyin: string;
  english: string;
  source?: string;
  difficulty?: number;
}

export interface ExamplesResponse {
  word: string;
  sentences: ExampleSentence[];
  count: number;
  sources: string[];
  cached?: boolean;
}

export async function fetchExamples(
  word: string,
  params?: { level?: number; limit?: number }
): Promise<ExamplesResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.level) searchParams.set('level', params.level.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const url = `${API_BASE}/examples/${encodeURIComponent(word)}?${searchParams.toString()}`;
  const response = await fetch(url);
  return handleResponse<ExamplesResponse>(response);
}

// Error helper
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

// Retry helper for transient failures
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (isAPIError(error) && error.status && error.status < 500) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Failed after retries');
}
