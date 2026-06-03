import { NextRequest, NextResponse } from 'next/server';
import { getWordById } from '@/data/hsk-vocabulary';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/word/[id]
 * Get detailed information about a specific word
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Word ID is required' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `word:${id}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // Get word from static data
    const word = getWordById(id);

    if (!word) {
      return NextResponse.json(
        { error: 'Word not found' },
        { status: 404 }
      );
    }

    // Enhanced word details
    // For now, we return the basic word info
    // In the future, this can be enhanced with external API data
    const wordDetails = {
      ...word,
      // Placeholder for future enhancements:
      // examples: await fetchExamples(word.simplified),
      // synonyms: await fetchSynonyms(word.simplified),
      // audioUrl: await fetchAudioUrl(word.simplified),
      // strokeOrder: await fetchStrokeOrder(word.simplified),
    };

    // Cache the result
    cache.set(cacheKey, wordDetails, CACHE_TTL.WORD_DETAILS);

    return NextResponse.json({
      ...wordDetails,
      cached: false,
    });
  } catch (error) {
    console.error('Error in word details API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
