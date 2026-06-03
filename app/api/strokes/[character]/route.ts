import { NextRequest, NextResponse } from 'next/server';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/strokes/[character]
 * Get stroke order data for a Chinese character
 * 
 * For now, returns metadata. Can be enhanced with:
 * - Hanzi Writer data integration
 * - Make Me a Hanzi API
 * - Local stroke order JSON files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ character: string }> }
) {
  try {
    const { character } = await params;
    
    if (!character) {
      return NextResponse.json(
        { error: 'Character is required' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `strokes:${character}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    // For now, return metadata indicating client-side rendering
    // In the future, this can fetch from:
    // 1. Hanzi Writer CDN data
    // 2. Make Me a Hanzi GitHub repository
    // 3. Local stroke order database
    
    const strokeInfo = {
      character,
      // These would be populated from external APIs:
      // strokes: [...], // Array of stroke path data
      // medians: [...], // Median lines for each stroke
      // radicals: [...], // Radical decomposition
      available: true, // Would check if data exists
      source: 'hanzi-writer', // Client-side library
    };

    // Cache the result
    cache.set(cacheKey, strokeInfo, CACHE_TTL.STROKES);

    return NextResponse.json({
      ...strokeInfo,
      cached: false,
    });
  } catch (error) {
    console.error('Error in strokes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
