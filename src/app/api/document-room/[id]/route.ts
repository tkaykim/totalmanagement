import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'document-room';
const DOWNLOAD_SIGNED_EXPIRES = 3600;

/** GET: 다운로드용 signed URL 반환 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createPureClient();

    const { data: row, error: fetchError } = await supabase
      .from('document_room_files')
      .select('file_path, file_name')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { data: signData, error: signError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(row.file_path, DOWNLOAD_SIGNED_EXPIRES);

    if (signError) {
      console.error('document-room signed URL error:', signError);
      return NextResponse.json(
        { error: signError.message },
        { status: 500 }
      );
    }

    const url =
      (signData as { signedUrl?: string })?.signedUrl ??
      (signData as { signedURL?: string })?.signedURL;

    if (!url) {
      return NextResponse.json(
        { error: 'Signed URL 생성 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url, file_name: row.file_name });
  } catch (err: unknown) {
    console.error('document-room [id] GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/** DELETE: 파일 및 스토리지 객체 삭제 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createPureClient();

    const { data: row, error: fetchError } = await supabase
      .from('document_room_files')
      .select('file_path')
      .eq('id', id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const { error: deleteDbError } = await supabase
      .from('document_room_files')
      .delete()
      .eq('id', id);

    if (deleteDbError) throw deleteDbError;

    await supabase.storage.from(BUCKET_NAME).remove([row.file_path]);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('document-room [id] DELETE error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
