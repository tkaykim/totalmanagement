'use client';

import ModooGoodsDashboard from '@/features/modoogoods/components/ModooGoodsDashboard';
import type { BU } from '@/types/database';

export default function ModooGoodsPage() {
  return <ModooGoodsDashboard bu="MODOO" />;
}

