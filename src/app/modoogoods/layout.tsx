import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MODOO GOODS ERP',
};

export default function ModooGoodsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}







