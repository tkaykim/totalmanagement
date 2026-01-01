import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FLOWMAKER ERP',
};

export default function FlowMakerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}




