import { NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

const GRIGO_PARTNER_ID = 8;

const SAFE_METADATA_KEYS = [
  'visa_type',
  'visa_end',
  'contract_start',
  'contract_end',
  'photo_url',
  'image_url',
  'avatar_url',
  'job_titles',
] as const;

function pickSafeMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const key of SAFE_METADATA_KEYS) {
    if (key in metadata && metadata[key] != null) {
      out[key] = metadata[key];
    }
  }
  return out;
}

export async function GET() {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createPureClient();
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, role, bu_code, partner_id')
      .eq('id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasAccess =
      appUser.role === 'artist' || appUser.bu_code === 'HEAD' || !!appUser.partner_id;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const partnerId = appUser.partner_id;
    if (partnerId == null) {
      return NextResponse.json({ profile: null });
    }

    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select(`
        id,
        display_name,
        name_ko,
        name_en,
        nationality,
        entity_type,
        metadata,
        partner_category_mappings(
          partner_categories(id, name, name_ko)
        ),
        partner_relations!partner_relations_child_partner_id_fkey(
          id,
          parent_partner_id,
          start_date,
          end_date,
          is_active
        )
      `)
      .eq('id', partnerId)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ profile: null });
    }

    const grigoRelation = (partner.partner_relations as any[])?.find(
      (r: any) => r.parent_partner_id === GRIGO_PARTNER_ID && r.is_active
    );

    const categories = (partner.partner_category_mappings as any[])
      ?.map((m: any) => m.partner_categories?.name_ko || m.partner_categories?.name)
      .filter(Boolean) || [];

    const safeMeta = pickSafeMetadata(partner.metadata as Record<string, unknown> | null);

    const profile = {
      id: partner.id,
      display_name: partner.display_name,
      name_ko: partner.name_ko,
      name_en: partner.name_en,
      nationality: partner.nationality,
      entity_type: partner.entity_type,
      job_titles: categories,
      contract_start: grigoRelation?.start_date ?? (safeMeta.contract_start as string | undefined),
      contract_end: grigoRelation?.end_date ?? (safeMeta.contract_end as string | undefined),
      visa_type: safeMeta.visa_type as string | undefined,
      visa_expiry: safeMeta.visa_end as string | undefined,
      photo_url: (safeMeta.photo_url ?? safeMeta.image_url ?? safeMeta.avatar_url) as string | undefined,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Artist profile API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
