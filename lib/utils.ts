import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDescriptionPoints(description?: string | null): string[] {
  if (!description) return [];
  // Split by newlines first
  const lines = description.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  
  // Clean up any leading bullet characters like •, -, *, or numbering (e.g. "1. ")
  return lines.map(line => {
      return line.replace(/^[•\-\*\s]+/, '').replace(/^\d+\.\s+/, '').trim();
  }).filter(line => line.length > 0);
}

