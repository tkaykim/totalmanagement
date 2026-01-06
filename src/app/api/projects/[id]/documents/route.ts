import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { data: documents, error } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(documents || []);
  } catch (error: any) {
    console.error('Failed to fetch project documents:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const authSupabase = await createClient();
    const { id } = await params;

    // 현재 로그인한 사용자 정보 가져오기
    const { data: { user } } = await authSupabase.auth.getUser();
    const userId = user?.id || null;

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const fileType = formData.get('file_type') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '파일이 제공되지 않았습니다' },
        { status: 400 }
      );
    }

    const uploadedDocuments = [];
    const baseTimestamp = Date.now();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 파일명에서 특수문자 제거 및 안전한 파일명 생성
      // 여러 파일 업로드 시 각 파일마다 고유한 타임스탬프 사용
      const timestamp = baseTimestamp + i;
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `projects/${id}/${timestamp}_${safeFileName}`;

      // Supabase Storage에 파일 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw uploadError;
      }

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      // 데이터베이스에 문서 정보 저장
      const { data: document, error: dbError } = await supabase
        .from('project_documents')
        .insert({
          project_id: Number(id),
          file_name: file.name,
          file_path: filePath,
          file_type: fileType || null,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (dbError) {
        // DB 저장 실패 시 업로드된 파일 삭제
        await supabase.storage.from('project-documents').remove([filePath]);
        throw dbError;
      }

      uploadedDocuments.push({
        ...document,
        public_url: urlData.publicUrl,
      });
    }

    return NextResponse.json(uploadedDocuments);
  } catch (error: any) {
    console.error('Failed to upload project documents:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

