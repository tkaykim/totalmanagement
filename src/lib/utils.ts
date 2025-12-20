import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BU } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SLUG_TO_BU: Record<string, BU> = {
  reactstudio: 'REACT',
  react: 'REACT',
  grigo: 'GRIGO',
  flow: 'FLOW',
  flowmaker: 'FLOW',
  ast: 'AST',
  modoo: 'MODOO',
};

const BU_TO_SLUG: Record<BU, string> = {
  REACT: 'reactstudio',
  GRIGO: 'grigo',
  FLOW: 'flow',
  AST: 'ast',
  MODOO: 'modoo',
};

export function slugToBu(slug: string): BU | null {
  const normalizedSlug = slug.toLowerCase();
  return SLUG_TO_BU[normalizedSlug] || null;
}

export function buToSlug(bu: BU): string {
  return BU_TO_SLUG[bu];
}
