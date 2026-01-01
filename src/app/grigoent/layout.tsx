import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GRIGO ERP',
};

export default function GrigoEntLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}





