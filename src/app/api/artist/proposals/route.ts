import { NextRequest, NextResponse } from 'next/server';
import { createPureClient, createClient } from '@/lib/supabase/server';

interface ArtistUser {
  id: string;
  role: string;
  partner_id: number | null;
}

async function getCurrentArtistUser(): Promise<ArtistUser | null> {
  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) return null;

  const supabase = await createPureClient();
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, role, partner_id')
    .eq('id', user.id)
    .single();

  return appUser as ArtistUser | null;
}

function mapResponseToDb(
  response: string
): 'pending' | 'accepted' | 'rejected' {
  if (response === 'accept') return 'accepted';
  if (response === 'reject') return 'rejected';
  return 'pending';
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentArtistUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.role !== 'artist' && !currentUser.partner_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const projectId = Number(body?.project_id);
    const response = body?.response as string | undefined;
    const message = typeof body?.message === 'string' ? body.message : undefined;

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json({ error: 'Invalid project_id' }, { status: 400 });
    }

    const allowedResponses = ['accept', 'reject', 'pending'];
    if (!response || !allowedResponses.includes(response)) {
      return NextResponse.json(
        { error: 'response must be one of: accept, reject, pending' },
        { status: 400 }
      );
    }

    const supabase = await createPureClient();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, pm_id, participants, share_partner_id, status')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isSharePartner =
      project.share_partner_id != null &&
      project.share_partner_id === currentUser.partner_id;
    const isPm = project.pm_id === currentUser.id;
    const isParticipant = (project.participants || []).some(
      (p: { user_id?: string }) => p.user_id === currentUser.id
    );

    let hasAssignedTask = false;
    if (!isSharePartner && !isPm && !isParticipant) {
      const { data: task } = await supabase
        .from('project_tasks')
        .select('id')
        .eq('project_id', projectId)
        .eq('assignee_id', currentUser.id)
        .limit(1)
        .single();
      hasAssignedTask = !!task;
    }

    const hasAccess = isSharePartner || isPm || isParticipant || hasAssignedTask;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this project' }, { status: 403 });
    }

    const proposalStatuses = ['준비중', '기획중'];
    if (!proposalStatuses.includes(project.status)) {
      return NextResponse.json(
        { error: 'Proposal response only allowed for projects in 준비중 or 기획중' },
        { status: 400 }
      );
    }

    const artistResponse = mapResponseToDb(response);

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        artist_response: artistResponse,
        artist_response_note: message ?? null,
        artist_responded_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Artist proposals update error:', updateError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      artist_response: artistResponse,
    });
  } catch (error) {
    console.error('Artist proposals API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
