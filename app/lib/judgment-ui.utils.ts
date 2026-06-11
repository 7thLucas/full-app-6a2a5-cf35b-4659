import type { JudgmentConfigLike, JudgmentSchemaPropertyLike } from "~/modules/judgment";

function toTitleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Fields that are AI-inferred outputs — never shown as user input
const AI_INFERRED_FIELDS = new Set([
  "score", "confidence", "severity", "verdict", "criterionId",
  "requiresHumanReview", "evidenceReferences", "provider", "model",
  "fixSuggestion", "reason",
]);

export function getFieldEntries(config: JudgmentConfigLike) {
  return Object.entries(config.inputSchema?.properties ?? {})
    .filter(([key]) => !AI_INFERRED_FIELDS.has(key))
    .map(([key, property]) => ({
      key,
      property,
      title: property.title ?? toTitleCase(key),
      description: property.description ?? "",
      isRequired: (config.inputSchema?.required ?? []).includes(key),
    }));
}

export function getFieldWidget(key: string, property: JudgmentSchemaPropertyLike) {
  const uiHint = property["x-ui"] as Record<string, unknown> | undefined;
  const widget = (uiHint?.widget as string | undefined)?.toLowerCase();
  if (widget) return widget;

  if (property.enum) return "select";
  if (property.type === "boolean") return "checkbox";
  if (property.type === "number" || property.type === "integer") return "number";
  if (property.type === "array") return "array";
  if (property.type === "object") return "json";
  if (property.format === "date") return "date";
  if (/note|comment|description|transcript|summary|details/i.test(key)) return "textarea";

  return "text";
}

export function getDefaultFieldValue(property: JudgmentSchemaPropertyLike) {
  if (property.default !== undefined) return property.default;
  if (property.enum?.length) return property.enum[0];
  if (property.type === "array") return [];
  if (property.type === "object") return {};
  if (property.type === "boolean") return false;
  if (property.type === "number" || property.type === "integer") return "";
  return "";
}

export function summarizeOutputFields(outputSchema: Record<string, unknown> | undefined): string[] {
  const properties = (outputSchema?.properties as Record<string, JudgmentSchemaPropertyLike> | undefined) ?? {};
  return Object.entries(properties).map(([key, property]) => `${key}${property.title ? ` (${property.title})` : ""}`);
}

export function mapJsonSchemaType(property: JudgmentSchemaPropertyLike): string {
  if (Array.isArray(property.type)) return property.type.join(" | ");
  return property.type ?? "string";
}
