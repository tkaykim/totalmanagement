'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const bu = searchParams.get('bu');
    const entityType = searchParams.get('entity_type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Get current user for permission check
    const { data: { user } } = await supabase.auth.getUser();
    let currentUserBu: string | null = null;
    let currentUserRole: string | null = null;
    
    if (user) {
      const { data: appUser } = await supabase
        .from('app_users')
        .select('bu_code, role')
        .eq('id', user.id)
        .single();
      currentUserBu = appUser?.bu_code || null;
      currentUserRole = appUser?.role || null;
    }

    // Build query
    let query = supabase
      .from('partners')
      .select(`
        *,
        partner_category_mappings(
          category_id,
          partner_categories(id, name, name_ko)
        ),
        partner_bu_access(bu_code, access_level),
        partner_relations!partner_relations_child_partner_id_fkey(
          parent_partner_id,
          relation_type,
          role_description,
          parent:partners!partner_relations_parent_partner_id_fkey(id, display_name, entity_type)
        )
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (bu && bu !== 'ALL') {
      query = query.eq('owner_bu_code', bu);
    }

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      query = query.or(
        `display_name.ilike.${searchPattern},name_ko.ilike.${searchPattern},name_en.ilike.${searchPattern},legal_name.ilike.${searchPattern}`
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Process data to add permission info
    const processedData = (data || []).map((partner: any) => {
      const isHeadAdmin = currentUserRole === 'admin' && currentUserBu === 'HEAD';
      const isAdmin = currentUserRole === 'admin';
      const isOwnerBu = partner.owner_bu_code === currentUserBu;
      const hasBuAccess = partner.partner_bu_access?.some(
        (access: any) => access.bu_code === currentUserBu && ['owner', 'full', 'view'].includes(access.access_level)
      );
      
      // FLOW Leader can view all dancers
      const partnerCategories = partner.partner_category_mappings?.map((m: any) => m.partner_categories?.name) || [];
      const isDancer = partnerCategories.includes('dancer');
      const isFlowLeader = currentUserBu === 'FLOW' && currentUserRole === 'leader';
      const canViewDancerAsFlowLeader = isDancer && isFlowLeader;
      
      const canViewDetails = isHeadAdmin || isAdmin || isOwnerBu || hasBuAccess || canViewDancerAsFlowLeader;

      // Extract categories
      const categories = partner.partner_category_mappings?.map((m: any) => ({
        id: m.partner_categories?.id,
        name: m.partner_categories?.name,
        name_ko: m.partner_categories?.name_ko,
      })) || [];

      // Extract affiliations (parent relations)
      const affiliations = partner.partner_relations?.map((r: any) => ({
        partner_id: r.parent_partner_id,
        display_name: r.parent?.display_name,
        entity_type: r.parent?.entity_type,
        relation_type: r.relation_type,
        role_description: r.role_description,
      })) || [];

      return {
        id: partner.id,
        display_name: partner.display_name,
        name_ko: partner.name_ko,
        name_en: partner.name_en,
        legal_name: canViewDetails ? partner.legal_name : null,
        entity_type: partner.entity_type,
        nationality: partner.nationality,
        email: canViewDetails ? partner.email : null,
        phone: canViewDetails ? partner.phone : null,
        website_url: partner.website_url,
        metadata: canViewDetails ? partner.metadata : {},
        owner_bu_code: partner.owner_bu_code,
        is_active: partner.is_active,
        created_at: partner.created_at,
        categories,
        affiliations,
        can_view_details: canViewDetails,
        access_status: canViewDetails ? 'granted' : 'request_required',
      };
    });

    // Filter by category if specified
    let filteredData = processedData;
    if (category) {
      filteredData = processedData.filter((p: any) => 
        p.categories.some((c: any) => c.name === category)
      );
    }

    return NextResponse.json({
      data: filteredData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch partners:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('bu_code')
      .eq('id', user.id)
      .single();

    if (!appUser?.bu_code) {
      return NextResponse.json({ error: 'User BU not found' }, { status: 400 });
    }

    const toNullIfEmpty = (value: any) =>
      value === '' || value === null || value === undefined ? null : value;

    // Create partner
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        display_name: body.display_name,
        name_ko: toNullIfEmpty(body.name_ko),
        name_en: toNullIfEmpty(body.name_en),
        legal_name: toNullIfEmpty(body.legal_name),
        entity_type: body.entity_type || 'person',
        nationality: toNullIfEmpty(body.nationality),
        email: toNullIfEmpty(body.email),
        phone: toNullIfEmpty(body.phone),
        website_url: toNullIfEmpty(body.website_url),
        metadata: body.metadata || {},
        owner_bu_code: appUser.bu_code,
        security_level: body.security_level || 'internal',
        sharing_policy: body.sharing_policy || 'request_only',
        created_by: user.id,
        is_active: true,
        tags: body.tags || [],
      })
      .select()
      .single();

    if (partnerError) throw partnerError;

    // Create owner BU access
    await supabase.from('partner_bu_access').insert({
      partner_id: partner.id,
      bu_code: appUser.bu_code,
      access_level: 'owner',
      granted_by: user.id,
    });

    // Create category mappings
    if (body.category_ids && body.category_ids.length > 0) {
      const categoryMappings = body.category_ids.map((categoryId: number) => ({
        partner_id: partner.id,
        category_id: categoryId,
      }));
      await supabase.from('partner_category_mappings').insert(categoryMappings);
    }

    // Create affiliation relations
    if (body.affiliations && body.affiliations.length > 0) {
      const relations = body.affiliations.map((aff: any) => ({
        parent_partner_id: aff.partner_id,
        child_partner_id: partner.id,
        relation_type: aff.relation_type || 'member',
        role_description: aff.role_description,
        is_active: true,
      }));
      await supabase.from('partner_relations').insert(relations);
    }

    // Share with additional BUs if specified
    if (body.shared_bu_codes && body.shared_bu_codes.length > 0) {
      const buAccess = body.shared_bu_codes.map((buCode: string) => ({
        partner_id: partner.id,
        bu_code: buCode,
        access_level: 'view',
        granted_by: user.id,
      }));
      await supabase.from('partner_bu_access').insert(buAccess);
    }

    return NextResponse.json(partner);
  } catch (error) {
    console.error('Failed to create partner:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
