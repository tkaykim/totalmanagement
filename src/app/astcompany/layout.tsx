import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AST COMPANY ERP',
};

export default function ASTCompanyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}




