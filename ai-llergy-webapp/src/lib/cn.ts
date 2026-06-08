/**
 * Tiny className joiner — dependency-free.
 * Filters out falsy values so conditional classes work cleanly:
 *   cn('btn', isActive && 'btn--active', error ? 'text-danger' : null)
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...classes: (ClassValue | ClassValue[])[]): string {
  return classes
    .flat()
    .filter((c): c is string | number => Boolean(c))
    .join(" ");
}
