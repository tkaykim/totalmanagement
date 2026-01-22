import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'comment-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// 첨부파일 업로드
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const commentId = formData.get('comment_id') as string;
    const file = formData.get('file') as File;

    if (!commentId || !file) {
      return NextResponse.json(
        { error: 'comment_id and file are required' },
        { status: 400 }
      );
    }

    // 파일 유효성 검사
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하만 가능합니다.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다.' },
        { status: 400 }
      );
    }

    // 댓글 존재 확인
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일 경로 생성 (comment_id/timestamp_filename)
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const filePath = `${commentId}/${timestamp}_${sanitizedFileName}`;

    // Storage에 파일 업로드
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: '파일 업로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    // DB에 첨부파일 정보 저장
    const { data: attachment, error: dbError } = await supabase
      .from('comment_attachments')
      .insert({
        comment_id: Number(commentId),
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (dbError) {
      // DB 저장 실패 시 업로드된 파일 삭제
      await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      throw dbError;
    }

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      ...attachment,
      public_url: urlData.publicUrl,
    }, { status: 201 });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// 첨부파일 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const attachmentId = searchParams.get('id');

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'attachment id is required' },
        { status: 400 }
      );
    }

    // 첨부파일 정보 조회
    const { data: attachment, error: fetchError } = await supabase
      .from('comment_attachments')
      .select('*, comment:comments(author_id)')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: '첨부파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 권한 확인 (댓글 작성자만 삭제 가능)
    const comment = attachment.comment as { author_id: string } | null;
    if (comment?.author_id !== user.id) {
      return NextResponse.json(
        { error: '삭제 권한이 없습니다.' },
        { status: 403 }
      );
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }

    // DB에서 첨부파일 정보 삭제
    const { error: dbError } = await supabase
      .from('comment_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attachment delete error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
