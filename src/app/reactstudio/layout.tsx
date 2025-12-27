import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'REACT STUDIO ERP',
};

export default function ReactStudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

