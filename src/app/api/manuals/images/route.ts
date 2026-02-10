import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'manual-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const manualId = formData.get('manual_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: '파일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하만 가능합니다.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. (JPEG, PNG, GIF, WebP만 가능)' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = manualId || 'temp';
    const filePath = `${folder}/${timestamp}_${sanitizedFileName}`;

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

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      file_path: filePath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }, { status: 201 });
  } catch (error) {
    console.error('Manual image upload error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
