import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

const ALLOWED_BUCKETS = ['comment-attachments', 'project-documents'] as const;
const DEFAULT_EXPIRES_IN = 3600; // 1 hour

/**
 * GET /api/storage/signed-url?bucket=...&path=...
 * Returns a signed URL for private bucket file access (preview/download).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket');
    const path = searchParams.get('path');

    if (!bucket || !path) {
      return NextResponse.json(
        { error: 'bucket and path are required' },
        { status: 400 }
      );
    }

    if (!ALLOWED_BUCKETS.includes(bucket as (typeof ALLOWED_BUCKETS)[number])) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    const expiresIn = Number(searchParams.get('expiresIn')) || DEFAULT_EXPIRES_IN;
    const supabase = await createPureClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create signed URL' },
        { status: 500 }
      );
    }

    const url = (data as { signedUrl?: string })?.signedUrl ?? (data as { signedURL?: string })?.signedURL;
    if (!url) {
      return NextResponse.json(
        { error: 'No signed URL in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url });
  } catch (err: unknown) {
    console.error('signed-url route error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
