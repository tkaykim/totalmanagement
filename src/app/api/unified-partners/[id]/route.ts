'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user for permission check
    const { data: { user } } = await supabase.auth.getUser();
    let currentUserBu: string | null = null;
    let currentUserRole: string | null = null;
    let currentUserId: string | null = null;

    if (user) {
      currentUserId = user.id;
      const { data: appUser } = await supabase
        .from('app_users')
        .select('bu_code, role')
        .eq('id', user.id)
        .single();
      currentUserBu = appUser?.bu_code || null;
      currentUserRole = appUser?.role || null;
    }

    const { data: partner, error } = await supabase
      .from('partners')
      .select(`
        *,
        partner_category_mappings(
          category_id,
          partner_categories(id, name, name_ko)
        ),
        partner_bu_access(bu_code, access_level),
        partner_relations!partner_relations_child_partner_id_fkey(
          id,
          parent_partner_id,
          relation_type,
          role_description,
          start_date,
          end_date,
          is_active,
          parent:partners!partner_relations_parent_partner_id_fkey(id, display_name, entity_type, name_ko)
        ),
        children:partner_relations!partner_relations_parent_partner_id_fkey(
          id,
          child_partner_id,
          relation_type,
          role_description,
          is_active,
          child:partners!partner_relations_child_partner_id_fkey(id, display_name, entity_type, name_ko)
        ),
        partner_user_access(user_id, access_level, valid_until)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Check permission
    const isHeadAdmin = currentUserRole === 'admin' && currentUserBu === 'HEAD';
    const isAdmin = currentUserRole === 'admin';
    const isOwnerBu = partner.owner_bu_code === currentUserBu;
    const hasBuAccess = partner.partner_bu_access?.some(
      (access: any) => access.bu_code === currentUserBu && ['owner', 'full', 'view'].includes(access.access_level)
    );
    const hasUserAccess = partner.partner_user_access?.some(
      (access: any) => access.user_id === currentUserId && 
        (access.valid_until === null || new Date(access.valid_until) >= new Date())
    );

    const canViewDetails = isHeadAdmin || isAdmin || isOwnerBu || hasBuAccess || hasUserAccess;
    const canEdit = isHeadAdmin || isAdmin || isOwnerBu || partner.partner_bu_access?.some(
      (access: any) => access.bu_code === currentUserBu && ['owner', 'full'].includes(access.access_level)
    );

    // Extract categories
    const categories = partner.partner_category_mappings?.map((m: any) => ({
      id: m.partner_categories?.id,
      name: m.partner_categories?.name,
      name_ko: m.partner_categories?.name_ko,
    })) || [];

    // Extract affiliations (parent relations)
    const affiliations = partner.partner_relations?.map((r: any) => ({
      id: r.id,
      partner_id: r.parent_partner_id,
      display_name: r.parent?.display_name,
      name_ko: r.parent?.name_ko,
      entity_type: r.parent?.entity_type,
      relation_type: r.relation_type,
      role_description: r.role_description,
      start_date: r.start_date,
      end_date: r.end_date,
      is_active: r.is_active,
    })) || [];

    // Extract members (child relations) - for teams/organizations
    const members = partner.children?.map((r: any) => ({
      id: r.id,
      partner_id: r.child_partner_id,
      display_name: r.child?.display_name,
      name_ko: r.child?.name_ko,
      entity_type: r.child?.entity_type,
      relation_type: r.relation_type,
      role_description: r.role_description,
      is_active: r.is_active,
    })) || [];

    const response = {
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
      security_level: partner.security_level,
      sharing_policy: partner.sharing_policy,
      is_active: partner.is_active,
      tags: partner.tags,
      created_at: partner.created_at,
      updated_at: partner.updated_at,
      categories,
      affiliations,
      members,
      can_view_details: canViewDetails,
      can_edit: canEdit,
      access_status: canViewDetails ? 'granted' : 'request_required',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch partner:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('bu_code, role')
      .eq('id', user.id)
      .single();

    // Check permission
    const { data: partner } = await supabase
      .from('partners')
      .select('owner_bu_code, partner_bu_access(bu_code, access_level)')
      .eq('id', id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const isHeadAdmin = appUser?.role === 'admin' && appUser?.bu_code === 'HEAD';
    const isAdmin = appUser?.role === 'admin';
    const isOwnerBu = partner.owner_bu_code === appUser?.bu_code;
    const hasEditAccess = partner.partner_bu_access?.some(
      (access: any) => access.bu_code === appUser?.bu_code && ['owner', 'full'].includes(access.access_level)
    );

    if (!isHeadAdmin && !isAdmin && !isOwnerBu && !hasEditAccess) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const toNullIfEmpty = (value: any) =>
      value === '' || value === null || value === undefined ? null : value;

    // Update partner
    const updateData: any = {};
    if (body.display_name !== undefined) updateData.display_name = body.display_name;
    if (body.name_ko !== undefined) updateData.name_ko = toNullIfEmpty(body.name_ko);
    if (body.name_en !== undefined) updateData.name_en = toNullIfEmpty(body.name_en);
    if (body.legal_name !== undefined) updateData.legal_name = toNullIfEmpty(body.legal_name);
    if (body.entity_type !== undefined) updateData.entity_type = body.entity_type;
    if (body.nationality !== undefined) updateData.nationality = toNullIfEmpty(body.nationality);
    if (body.email !== undefined) updateData.email = toNullIfEmpty(body.email);
    if (body.phone !== undefined) updateData.phone = toNullIfEmpty(body.phone);
    if (body.website_url !== undefined) updateData.website_url = toNullIfEmpty(body.website_url);
    if (body.metadata !== undefined) updateData.metadata = body.metadata;
    if (body.security_level !== undefined) updateData.security_level = body.security_level;
    if (body.sharing_policy !== undefined) updateData.sharing_policy = body.sharing_policy;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.tags !== undefined) updateData.tags = body.tags;

    const { data: updatedPartner, error } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update categories if provided
    if (body.category_ids !== undefined) {
      await supabase.from('partner_category_mappings').delete().eq('partner_id', id);
      if (body.category_ids.length > 0) {
        const categoryMappings = body.category_ids.map((categoryId: number) => ({
          partner_id: parseInt(id),
          category_id: categoryId,
        }));
        await supabase.from('partner_category_mappings').insert(categoryMappings);
      }
    }

    // Update affiliations if provided
    if (body.affiliations !== undefined) {
      await supabase.from('partner_relations').delete().eq('child_partner_id', id);
      if (body.affiliations.length > 0) {
        const relations = body.affiliations.map((aff: any) => ({
          parent_partner_id: aff.partner_id,
          child_partner_id: parseInt(id),
          relation_type: aff.relation_type || 'member',
          role_description: aff.role_description,
          is_active: true,
        }));
        await supabase.from('partner_relations').insert(relations);
      }
    }

    return NextResponse.json(updatedPartner);
  } catch (error) {
    console.error('Failed to update partner:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: appUser } = await supabase
      .from('app_users')
      .select('bu_code, role')
      .eq('id', user.id)
      .single();

    // Check permission
    const { data: partner } = await supabase
      .from('partners')
      .select('owner_bu_code')
      .eq('id', id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const isHeadAdmin = appUser?.role === 'admin' && appUser?.bu_code === 'HEAD';
    const isAdmin = appUser?.role === 'admin';
    const isOwnerBu = partner.owner_bu_code === appUser?.bu_code;

    if (!isHeadAdmin && !isAdmin && !isOwnerBu) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from('partners')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete partner:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
