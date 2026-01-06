import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id, documentId } = await params;

    // 문서 정보 조회
    const { data: document, error: fetchError } = await supabase
      .from('project_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('project_id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!document) {
      return NextResponse.json(
        { error: '문서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from('project-documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Storage 삭제 실패해도 DB는 삭제 진행
    }

    // 데이터베이스에서 문서 정보 삭제
    const { error: deleteError } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId)
      .eq('project_id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete project document:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}



