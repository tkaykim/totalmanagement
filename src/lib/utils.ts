import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BU } from "@/types/database";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buToRoute(bu: BU | null | undefined): string {
  return '/';
}

export function buToSlug(bu: BU): string {
  return '';
}
