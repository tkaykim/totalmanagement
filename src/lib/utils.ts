import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BU } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SLUG_TO_BU: Record<string, BU> = {
  reactstudio: 'REACT',
  flow: 'FLOW',
  flowmaker: 'FLOW',
  modoo: 'MODOO',
};

const BU_TO_SLUG: Record<BU, string> = {
  REACT: 'reactstudio',
  GRIGO: 'grigoent',
  FLOW: 'flow',
  AST: 'astcompany',
  MODOO: 'modoo',
  HEAD: '',
};

export function buToRoute(bu: BU | null | undefined): string {
  if (!bu) return '/login';
  if (bu === 'HEAD') return '/';
  if (bu === 'AST') return '/astcompany';
  if (bu === 'GRIGO') return '/grigoent';
  return `/${BU_TO_SLUG[bu]}`;
}

export function slugToBu(slug: string): BU | null {
  const normalizedSlug = slug.toLowerCase();
  return SLUG_TO_BU[normalizedSlug] || null;
}

export function buToSlug(bu: BU): string {
  return BU_TO_SLUG[bu];
}
