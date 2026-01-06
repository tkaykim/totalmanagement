import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // 검색 조건 생성
    const buildSearchQuery = (query: any) => {
      if (!search.trim()) return query;
      
      const searchPattern = `%${search}%`;
      // Supabase의 or() 메서드는 필드명.연산자.값 형식으로 여러 조건을 OR로 연결
      return query.or(
        `name.ilike.${searchPattern},nickname_ko.ilike.${searchPattern},nickname_en.ilike.${searchPattern},real_name.ilike.${searchPattern},team_name.ilike.${searchPattern},company.ilike.${searchPattern},nationality.ilike.${searchPattern},contact.ilike.${searchPattern}`
      );
    };

    // 전체 개수 조회 (검색 조건 포함)
    let countQuery = supabase.from('dancers').select('*', { count: 'exact', head: true });
    if (bu) {
      countQuery = countQuery.eq('bu_code', bu);
    }
    countQuery = buildSearchQuery(countQuery);
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // 페이지네이션된 데이터 조회 (검색 조건 포함)
    let query = supabase
      .from('dancers')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bu) {
      query = query.eq('bu_code', bu);
    }
    query = buildSearchQuery(query);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const body = await request.json();

    // 필수 필드 검증
    if (!body.bu_code || !body.name) {
      return NextResponse.json(
        { error: 'bu_code and name are required' },
        { status: 400 }
      );
    }

    const insertData: any = {
      bu_code: body.bu_code,
      name: body.name,
    };

    // 선택적 필드 추가 (null이 아닌 경우만)
    if (body.nickname_ko !== undefined && body.nickname_ko !== null) insertData.nickname_ko = body.nickname_ko;
    if (body.nickname_en !== undefined && body.nickname_en !== null) insertData.nickname_en = body.nickname_en;
    if (body.real_name !== undefined && body.real_name !== null) insertData.real_name = body.real_name;
    if (body.photo !== undefined && body.photo !== null) insertData.photo = body.photo;
    if (body.team_name !== undefined && body.team_name !== null) insertData.team_name = body.team_name;
    if (body.company !== undefined && body.company !== null) insertData.company = body.company;
    if (body.nationality !== undefined && body.nationality !== null) insertData.nationality = body.nationality;
    if (body.gender !== undefined && body.gender !== null) insertData.gender = body.gender;
    if (body.contact !== undefined && body.contact !== null) insertData.contact = body.contact;
    if (body.bank_copy !== undefined && body.bank_copy !== null) insertData.bank_copy = body.bank_copy;
    if (body.bank_name !== undefined && body.bank_name !== null) insertData.bank_name = body.bank_name;
    if (body.account_number !== undefined && body.account_number !== null) insertData.account_number = body.account_number;
    if (body.id_document_type !== undefined && body.id_document_type !== null) insertData.id_document_type = body.id_document_type;
    if (body.id_document_file !== undefined && body.id_document_file !== null) insertData.id_document_file = body.id_document_file;
    if (body.note !== undefined && body.note !== null) insertData.note = body.note;

    const { data, error } = await supabase.from('dancers').insert(insertData).select().single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create dancer', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
}

