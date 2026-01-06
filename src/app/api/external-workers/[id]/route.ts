import { NextRequest, NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';

// 하위 호환성을 위해 external_workers 대신 partner_worker 사용
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('partner_worker')
      .select('*')
      .eq('id', id)
      .in('worker_type', ['freelancer', 'contractor'])
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;
    const body = await request.json();

    const toNullIfEmpty = (value: any) =>
      value === '' || value === null || value === undefined ? null : value;

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

    const updateData: any = {};
    if (body.bu_code !== undefined) updateData.bu_code = body.bu_code;
    if (body.name !== undefined) updateData.name = body.name;
    if (workerType !== undefined) updateData.worker_type = workerType;
    if (body.phone !== undefined) updateData.phone = toNullIfEmpty(body.phone);
    if (body.email !== undefined) updateData.email = toNullIfEmpty(body.email);
    if (body.specialties !== undefined) updateData.specialties = body.specialties || [];
    if (body.notes !== undefined) updateData.notes = toNullIfEmpty(body.notes);
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (partnerCompanyId !== null) updateData.partner_company_id = partnerCompanyId;

    const { data, error } = await supabase
      .from('partner_worker')
      .update(updateData)
      .eq('id', id)
      .in('worker_type', ['freelancer', 'contractor'])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createPureClient();
    const { id } = await params;

    const { error } = await supabase
      .from('partner_worker')
      .delete()
      .eq('id', id)
      .in('worker_type', ['freelancer', 'contractor']);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
