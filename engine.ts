import type { DecisionEngine, DecisionInput } from "./ports.ts";
import type { Rule } from "./rule.ts";

function getFieldValue(value: DecisionInput, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);
}

function evaluateExpr(rule: Rule, value: DecisionInput): boolean {
  if (rule.gte) {
    const [field, threshold] = rule.gte;
    const fieldValue = getFieldValue(value, field);
    return typeof fieldValue === "number" && typeof threshold === "number"
      ? fieldValue >= threshold
      : Number(fieldValue) >= Number(threshold);
  }

  if (rule.eq) {
    const [field, expected] = rule.eq;
    return getFieldValue(value, field) === expected;
  }

  if (rule.in) {
    const [item, field] = rule.in;
    const list = getFieldValue(value, field);
    return Array.isArray(list) && list.includes(item);
  }

  if (rule.and) {
    return rule.and.every((subRule) => evaluateExpr(subRule, value));
  }

  return false;
}

export const engine: DecisionEngine = {
  evaluateExpr,
};
