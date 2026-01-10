import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

interface ArtistUser {
  id: string;
  role: string;
  bu_code: string | null;
  name: string;
  partner_id: number | null;
}

async function getCurrentArtistUser(): Promise<ArtistUser | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, role, bu_code, name, partner_id')
    .eq('id', user.id)
    .single();

  return appUser as ArtistUser | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createPureClient();
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');

    const currentUser = await getCurrentArtistUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 아티스트 역할이거나 partner_id가 있는 사용자만 접근 가능
    if (currentUser.role !== 'artist' && !currentUser.partner_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!currentUser.partner_id) {
      // partner_id가 없으면 정산 내역이 없음
      return NextResponse.json({
        settlements: [],
        partnerSettlements: [],
        summary: {
          draft: { count: 0, amount: 0 },
          confirmed: { count: 0, amount: 0 },
          paid: { count: 0, amount: 0 },
          total: { count: 0, amount: 0 },
        }
      });
    }

    // 새로운 파트너 정산 시스템에서 조회
    let partnerQuery = supabase
      .from('partner_settlements')
      .select(`
        *,
        partner_settlement_projects(
          *,
          project:projects!project_id(id, name)
        )
      `)
      .eq('partner_id', currentUser.partner_id)
      .order('created_at', { ascending: false });

    if (startDate) {
      partnerQuery = partnerQuery.gte('period_start', startDate);
    }

    if (endDate) {
      partnerQuery = partnerQuery.lte('period_end', endDate);
    }

    if (status) {
      partnerQuery = partnerQuery.eq('status', status);
    }

    const { data: partnerSettlements, error: partnerError } = await partnerQuery;

    if (partnerError) throw partnerError;

    // 기존 financial_entries에서도 조회 (하위 호환성)
    let legacyQuery = supabase
      .from('financial_entries')
      .select(`
        *,
        projects:project_id (
          id,
          name,
          status
        )
      `)
      .eq('partner_id', currentUser.partner_id)
      .eq('kind', 'expense')
      .order('occurred_at', { ascending: false });

    if (startDate) {
      legacyQuery = legacyQuery.gte('occurred_at', startDate);
    }

    if (endDate) {
      legacyQuery = legacyQuery.lte('occurred_at', endDate);
    }

    const { data: legacySettlements, error: legacyError } = await legacyQuery;

    if (legacyError) throw legacyError;

    // 상태별 집계 (새 정산 시스템 기준)
    const draft = (partnerSettlements || []).filter((s: any) => s.status === 'draft');
    const confirmed = (partnerSettlements || []).filter((s: any) => s.status === 'confirmed');
    const paid = (partnerSettlements || []).filter((s: any) => s.status === 'paid');

    const sumPartnerAmount = (items: any[]) => 
      items.reduce((sum, item) => sum + (item.partner_amount || 0), 0);

    const result = {
      settlements: legacySettlements || [],
      partnerSettlements: partnerSettlements || [],
      summary: {
        draft: {
          count: draft.length,
          amount: sumPartnerAmount(draft),
        },
        confirmed: {
          count: confirmed.length,
          amount: sumPartnerAmount(confirmed),
        },
        paid: {
          count: paid.length,
          amount: sumPartnerAmount(paid),
        },
        total: {
          count: (partnerSettlements || []).length,
          amount: sumPartnerAmount(partnerSettlements || []),
        },
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Artist settlements API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
