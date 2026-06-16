import type { FieldDefinition, FieldType } from "./types";

export function parseJsonObject(input: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(input);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function inferFields(input: unknown): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  function visit(value: unknown, prefix: string): void {
    if (!prefix) {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        Object.entries(value).forEach(([key, nestedValue]) => {
          visit(nestedValue, key);
        });
      }
      return;
    }

    const type = getFieldType(value);
    fields.push({ path: prefix, type });

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([key, nestedValue]) => {
        visit(nestedValue, `${prefix}.${key}`);
      });
    }
  }

  visit(input, "");
  return fields.sort((a, b) => a.path.localeCompare(b.path));
}

export function getFieldType(value: unknown): FieldType {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "unknown";
  }
}

export function fieldTypeForPath(
  fields: FieldDefinition[],
  path: string,
): FieldType | undefined {
  return fields.find((field) => field.path === path)?.type;
}
