import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'document-room';
const SIGNED_URL_EXPIRES_IN = 3600;

export type DocumentRoomCategory = 'business_registration' | 'bank_copy' | 'introduction' | 'other';

export interface DocumentRoomFileRow {
  id: number;
  category: DocumentRoomCategory;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  download_url?: string;
  uploader_name?: string | null;
}

/** GET: 목록 조회 (카테고리 필터 optional) */
export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as DocumentRoomCategory | null;

    let query = supabase
      .from('document_room_files')
      .select('id, category, file_name, file_path, file_size, mime_type, created_by, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    const withUrls = await Promise.all(
      (rows || []).map(async (row: DocumentRoomFileRow) => {
        const { data: signData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(row.file_path, SIGNED_URL_EXPIRES_IN);
        const signedUrl =
          (signData as { signedUrl?: string })?.signedUrl ??
          (signData as { signedURL?: string })?.signedURL;
        return { ...row, download_url: signedUrl ?? null };
      })
    );

    return NextResponse.json(withUrls);
  } catch (err: unknown) {
    console.error('document-room GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** POST: 파일 업로드 (formData: file, category) */
export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as DocumentRoomCategory | null;

    if (!file || !category) {
      return NextResponse.json(
        { error: 'file과 category가 필요합니다.' },
        { status: 400 }
      );
    }

    const allowed: DocumentRoomCategory[] = ['business_registration', 'bank_copy', 'introduction', 'other'];
    if (!allowed.includes(category)) {
      return NextResponse.json(
        { error: '유효하지 않은 category입니다.' },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${category}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('document-room upload error:', uploadError);
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from('document_room_files')
      .insert({
        category,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      throw insertError;
    }

    return NextResponse.json(inserted);
  } catch (err: unknown) {
    console.error('document-room POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
