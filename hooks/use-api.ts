/**
 * Custom React hooks for API data fetching with SWR
 */

import useSWR from 'swr';
import type { SWRConfiguration } from 'swr';
import {
  fetchVocabulary,
  fetchWordDetails,
  fetchAudioInfo,
  fetchStrokeOrder,
  fetchExamples,
  fetchWithRetry,
  type VocabularyResponse,
  type WordDetailsResponse,
  type AudioResponse,
  type StrokeOrderResponse,
  type ExamplesResponse,
} from '@/lib/api-client';

// Default SWR configuration
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
};

/**
 * Hook to fetch vocabulary with SWR
 */
export function useVocabulary(params?: {
  level?: number;
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const key = params
    ? ['vocabulary', params.level, params.limit, params.offset, params.search]
    : null;

  const { data, error, isLoading, mutate } = useSWR<VocabularyResponse>(
    key,
    () => fetchWithRetry(() => fetchVocabulary(params)),
    defaultConfig
  );

  return {
    vocabulary: data,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch word details with SWR
 */
export function useWordDetails(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<WordDetailsResponse>(
    id ? ['word', id] : null,
    () => fetchWithRetry(() => fetchWordDetails(id!)),
    {
      ...defaultConfig,
      revalidateOnMount: true,
    }
  );

  return {
    word: data,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to fetch audio info with SWR
 */
export function useAudioInfo(text: string | null, lang = 'zh-CN') {
  const { data, error, isLoading } = useSWR<AudioResponse>(
    text ? ['audio', text, lang] : null,
    () => fetchWithRetry(() => fetchAudioInfo(text!, lang)),
    {
      ...defaultConfig,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  return {
    audioInfo: data,
    isLoading,
    isError: error,
  };
}

/**
 * Hook to fetch stroke order with SWR
 */
export function useStrokeOrder(character: string | null) {
  const { data, error, isLoading } = useSWR<StrokeOrderResponse>(
    character ? ['strokes', character] : null,
    () => fetchWithRetry(() => fetchStrokeOrder(character!)),
    {
      ...defaultConfig,
      dedupingInterval: 3600000, // Cache for 1 hour (strokes don't change)
    }
  );

  return {
    strokeOrder: data,
    isLoading,
    isError: error,
  };
}

/**
 * Hook to fetch examples with SWR
 */
export function useExamples(
  word: string | null,
  params?: { level?: number; limit?: number }
) {
  const key = word
    ? ['examples', word, params?.level, params?.limit]
    : null;

  const { data, error, isLoading, mutate } = useSWR<ExamplesResponse>(
    key,
    () => fetchWithRetry(() => fetchExamples(word!, params)),
    defaultConfig
  );

  return {
    examples: data,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Hook to preload data for better UX
 */
export function usePreload() {
  const { mutate } = useSWR();

  const preloadWord = (id: string) => {
    mutate(['word', id], fetchWordDetails(id), { revalidate: false });
  };

  const preloadVocabulary = (params: Parameters<typeof fetchVocabulary>[0]) => {
    const key = ['vocabulary', params?.level, params?.limit, params?.offset, params?.search];
    mutate(key, fetchVocabulary(params), { revalidate: false });
  };

  return {
    preloadWord,
    preloadVocabulary,
  };
}
