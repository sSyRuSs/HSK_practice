import { NextRequest, NextResponse } from 'next/server';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/audio
 * Query parameters:
 * - text: Chinese text to synthesize
 * - lang: Language code (default: zh-CN)
 * 
 * For now, returns metadata for client-side synthesis.
 * Can be enhanced with server-side TTS API integration.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const lang = searchParams.get('lang') || 'zh-CN';

    if (!text) {
      return NextResponse.json(
        { error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    // Create cache key
    const cacheKey = `audio:${text}:${lang}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // For now, return metadata for client-side Web Speech API
    // In the future, this can be enhanced with:
    // 1. Google Cloud Text-to-Speech API
    // 2. Azure TTS API
    // 3. Forvo API for native speaker recordings
    // 4. Pre-recorded audio files from HSK audio resources
    
    const audioInfo = {
      text,
      lang,
      method: 'client-side', // or 'server-side' when implemented
      // For server-side TTS, would include:
      // audioUrl: 'https://...',
      // duration: 1.5,
      // format: 'mp3',
    };

    // Cache the result
    cache.set(cacheKey, audioInfo, CACHE_TTL.AUDIO);

    return NextResponse.json({
      ...audioInfo,
      cached: false,
    });
  } catch (error) {
    console.error('Error in audio API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audio
 * Generate audio for bulk text
 * Body: { texts: string[], lang?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { texts, lang = 'zh-CN' } = body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { error: 'texts array is required' },
        { status: 400 }
      );
    }

    // Process each text
    const results = texts.map((text) => {
      const cacheKey = `audio:${text}:${lang}`;
      const cached = cache.get(cacheKey);
      
      if (cached) {
        return { ...cached, cached: true };
      }

      const audioInfo = {
        text,
        lang,
        method: 'client-side',
      };

      cache.set(cacheKey, audioInfo, CACHE_TTL.AUDIO);
      
      return { ...audioInfo, cached: false };
    });

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('Error in audio bulk API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
