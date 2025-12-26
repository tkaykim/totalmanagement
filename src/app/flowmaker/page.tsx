'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import FlowMakerDashboard from '@/features/flowmaker/components/FlowMakerDashboard';
import type { BU } from '@/types/database';

export default function FlowMakerPage() {
  const router = useRouter();
  const [bu, setBu] = useState<BU>('FLOW');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: appUser } = await supabase
        .from('app_users')
        .select('bu_code')
        .eq('id', user.id)
        .single();

      if (appUser?.bu_code && appUser.bu_code !== 'FLOW' && appUser.bu_code !== 'HEAD') {
        router.push('/login');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 mx-auto" />
          <p className="text-sm text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return <FlowMakerDashboard bu={bu} />;
}



