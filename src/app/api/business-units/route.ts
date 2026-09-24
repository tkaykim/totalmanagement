import { NextResponse } from 'next/server';
import { createPureClient } from '@/lib/supabase/server';
import { requireActiveStaff, isGuardFailure } from '@/lib/auth-guard';

export async function GET() {
  const guard = await requireActiveStaff();
  if (isGuardFailure(guard)) return guard;

  try {
    const supabase = await createPureClient();

    const { data, error } = await supabase
      .from('business_units')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


