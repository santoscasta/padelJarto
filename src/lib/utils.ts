import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)+/g, "");
}

export function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return format(new Date(value), "d MMM yyyy");
}

export function formatDateTimeLabel(value?: string | null) {
  if (!value) {
    return "Pendiente";
  }

  return format(new Date(value), "d MMM yyyy, HH:mm");
}

export function toDateTimeLocalInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function unique<T>(values: T[]) {
  return [...new Set(values)];
}
