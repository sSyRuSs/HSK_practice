import { NextRequest, NextResponse } from 'next/server';
import { hskVocabulary, type VocabWord } from '@/data/hsk-vocabulary';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/vocabulary
 * Query parameters:
 * - level: HSK level (1-6), optional
 * - limit: number of words to return, default 50
 * - offset: pagination offset, default 0
 * - search: search term (simplified/pinyin/meaning), optional
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search')?.toLowerCase();

    // Create cache key
    const cacheKey = `vocab:${level || 'all'}:${limit}:${offset}:${search || ''}`;
    
    // Check cache
    const cached = cache.get<{ words: VocabWord[]; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // Filter vocabulary
    let filtered = [...hskVocabulary];

    // Filter by level if provided
    if (level) {
      const levelNum = parseInt(level, 10);
      if (levelNum >= 1 && levelNum <= 6) {
        filtered = filtered.filter((word) => word.level === levelNum);
      }
    }

    // Filter by search term if provided
    if (search) {
      filtered = filtered.filter(
        (word) =>
          word.simplified.toLowerCase().includes(search) ||
          word.pinyin.toLowerCase().includes(search) ||
          word.meaning.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;

    // Apply pagination
    const words = filtered.slice(offset, offset + limit);

    const result = {
      words,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };

    // Cache the result
    cache.set(cacheKey, { words, total }, CACHE_TTL.VOCABULARY);

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    console.error('Error in vocabulary API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
