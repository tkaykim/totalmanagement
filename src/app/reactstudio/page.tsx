'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReactStudioDashboard from '@/features/reactstudio/components/ReactStudioDashboard';
import type { BU } from '@/types/database';

export default function ReactStudioPage() {
  const router = useRouter();
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
        .select('bu_code, role')
        .eq('id', user.id)
        .single();

      // role이 artist인 경우 /my-profile로 리디렉션
      if (appUser?.role === 'artist') {
        router.push('/grigoent/my-profile');
        return;
      }

      // bu_code가 null인 경우 /my-works로 리디렉션
      if (!appUser?.bu_code) {
        router.push('/my-works');
        return;
      }

      if (appUser.bu_code !== 'REACT' && appUser.bu_code !== 'HEAD') {
        router.push('/login');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return <ReactStudioDashboard bu="REACT" />;
}



