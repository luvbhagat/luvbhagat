import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tiny helper used by Shadcn UI components: merges Tailwind class names
// together and resolves conflicts (e.g. "p-2" + "p-4" → "p-4").
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
