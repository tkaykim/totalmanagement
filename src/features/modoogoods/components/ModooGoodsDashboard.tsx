'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function ModooGoodsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
    router.push('/login');
        return;
      }

      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (appUser?.bu_code && appUser.bu_code !== 'MODOO' && appUser.bu_code !== 'HEAD') {
        if (appUser.bu_code === 'GRIGO') {
          router.push('/grigoent');
        } else if (appUser.bu_code === 'AST') {
          router.push('/astcompany');
        } else if (appUser.bu_code === 'REACT') {
          router.push('/reactstudio');
        } else if (appUser.bu_code === 'FLOW') {
          router.push('/flow');
        }
        return;
      }

      setUser({ ...authUser, profile: appUser });
    };

    checkUser();
  }, [router]);

  if (!user) {
      return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
        </div>
      );
  }

    return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar placeholder */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 text-white">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              M
              </div>
                <div>
              <h1 className="text-lg font-bold">모두굿즈</h1>
              <span className="text-xs text-orange-400 uppercase tracking-wider">Modoo Goods</span>
                  </div>
                  </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title="모두굿즈 ERP"
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Empty content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <p className="text-lg">페이지 준비 중입니다.</p>
                  </div>
                    </div>
        </main>
    </div>
  );
}
