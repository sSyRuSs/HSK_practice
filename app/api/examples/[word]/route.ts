import { NextRequest, NextResponse } from 'next/server';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/examples/[word]
 * Get example sentences for a Chinese word
 * 
 * Can be enhanced with:
 * - Tatoeba API integration
 * - Jukuu API
 * - Local sentence database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ word: string }> }
) {
  try {
    const { word } = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level'); // HSK level filter
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    
    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `examples:${word}:${level || 'all'}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // For now, return empty examples with metadata
    // In the future, this can fetch from:
    // 1. Tatoeba API: https://tatoeba.org/
    // 2. Jukuu: http://www.jukuu.com/
    // 3. Local sentence database
    // 4. AI-generated examples (with proper marking)
    
    const examples = {
      word,
      sentences: [
        // Example structure:
        // {
        //   chinese: "我爱学习中文。",
        //   pinyin: "wǒ ài xuéxí zhōngwén",
        //   english: "I love studying Chinese.",
        //   source: "tatoeba",
        //   difficulty: 1, // HSK level
        // }
      ],
      count: 0,
      sources: [], // Would list: ['tatoeba', 'local', 'ai']
    };

    // Cache the result
    cache.set(cacheKey, examples, CACHE_TTL.WORD_DETAILS);

    return NextResponse.json({
      ...examples,
      cached: false,
    });
  } catch (error) {
    console.error('Error in examples API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
