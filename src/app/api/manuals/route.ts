import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active_only') !== 'false';

    let query = supabase.from('manuals').select('*').order('updated_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('manuals')
      .insert({
        bu_code: body.bu_code,
        title: body.title,
        category: body.category,
        content: body.content || { blocks: [] },
        author_id: body.author_id,
        author_name: body.author_name,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
















