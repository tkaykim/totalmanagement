import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import type { BU } from '@/types/database';

// 하위 호환성을 위해 external_workers 대신 partner_worker 사용 (worker_type IN ('freelancer', 'contractor') 필터링)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const bu = searchParams.get('bu') as BU | null;

    let query = supabase
      .from('partner_worker')
      .select('*')
      .in('worker_type', ['freelancer', 'contractor'])
      .order('created_at', { ascending: false });

    if (bu) {
      query = query.eq('bu_code', bu);
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

    const toNullIfEmpty = (value: any) => (value === '' || value === null || value === undefined ? null : value);

    // worker_type 매핑: 'company' -> 'contractor'
    const workerType = body.worker_type === 'company' ? 'contractor' : (body.worker_type || 'freelancer');

    // company_name이 있으면 partner_company 찾기 또는 생성
    let partnerCompanyId = null;
    if (body.company_name) {
      const { data: existingCompany } = await supabase
        .from('partner_company')
        .select('id')
        .eq('company_name_ko', body.company_name)
        .eq('bu_code', body.bu_code)
        .single();

      if (existingCompany) {
        partnerCompanyId = existingCompany.id;
      } else {
        // 새 회사 생성
        const { data: newCompany } = await supabase
          .from('partner_company')
          .insert({
            bu_code: body.bu_code,
            company_name_ko: body.company_name,
            partner_type: workerType === 'contractor' ? 'contractor' : 'vendor',
            status: 'active',
          })
          .select('id')
          .single();
        
        if (newCompany) {
          partnerCompanyId = newCompany.id;
        }
      }
    }

    const { data, error } = await supabase
      .from('partner_worker')
      .insert({
        partner_company_id: partnerCompanyId,
        bu_code: body.bu_code,
        name: body.name,
        worker_type: workerType,
        phone: toNullIfEmpty(body.phone),
        email: toNullIfEmpty(body.email),
        specialties: body.specialties || [],
        notes: toNullIfEmpty(body.notes),
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}












