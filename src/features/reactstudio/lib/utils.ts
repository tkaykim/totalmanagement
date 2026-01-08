export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
}

export function formatUserName(user: any): string {
  if (user.name_ko && user.name_en) {
    return `${user.name_ko}(${user.name_en})`;
  }
  if (user.name_ko) return user.name_ko;
  if (user.name_en) return user.name_en;
  return user.name || '';
}

export function formatPartnerWorkerName(worker: any): string {
  if (worker.name_ko && worker.name_en) {
    return `${worker.name_ko}(${worker.name_en})`;
  }
  if (worker.name_ko) return worker.name_ko;
  if (worker.name_en) return worker.name_en;
  return worker.name || '';
}



