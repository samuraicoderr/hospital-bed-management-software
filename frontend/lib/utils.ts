import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx for conditional class names */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function interpretServerError(
  error: unknown,
  seen = new WeakSet()
): string[] {
  const messages: string[] = [];

  if (error && typeof error === "object") {
    if (seen.has(error)) return messages; // prevent infinite recursion
    seen.add(error);

    for (const key of Object.keys(error)) {
      const value = (error as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        messages.push(...value.map(String));
      } else if (typeof value === "string") {
        messages.push(value);
      } else if (typeof value === "object" && value !== null) {
        messages.push(...interpretServerError(value, seen));
      } else if (value != null) {
        messages.push(String(value));
      }
    }
  }

  return messages;
}
