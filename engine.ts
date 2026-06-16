import type { DecisionEngine, DecisionInput } from "./ports.ts";
import {
  isAndRule,
  isContainsRule,
  isEqRule,
  isExistsRule,
  isGtRule,
  isGteRule,
  isInRule,
  isLtRule,
  isLteRule,
  isNeqRule,
  isNotRule,
  isOrRule,
  type Rule,
} from "./rule.ts";

function getFieldValue(value: DecisionInput, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);
}

function compareValues(
  fieldValue: unknown,
  threshold: unknown,
  compare: (fieldValue: number, threshold: number) => boolean,
): boolean {
  return typeof fieldValue === "number" && typeof threshold === "number"
    ? compare(fieldValue, threshold)
    : compare(Number(fieldValue), Number(threshold));
}

function evaluateExpr(rule: Rule, value: DecisionInput): boolean {
  if (isGteRule(rule)) {
    const [field, threshold] = rule.gte;
    const fieldValue = getFieldValue(value, field);
    return compareValues(fieldValue, threshold, (fieldValue, threshold) => {
      return fieldValue >= threshold;
    });
  }

  if (isLteRule(rule)) {
    const [field, threshold] = rule.lte;
    const fieldValue = getFieldValue(value, field);
    return compareValues(fieldValue, threshold, (fieldValue, threshold) => {
      return fieldValue <= threshold;
    });
  }

  if (isGtRule(rule)) {
    const [field, threshold] = rule.gt;
    const fieldValue = getFieldValue(value, field);
    return compareValues(fieldValue, threshold, (fieldValue, threshold) => {
      return fieldValue > threshold;
    });
  }

  if (isLtRule(rule)) {
    const [field, threshold] = rule.lt;
    const fieldValue = getFieldValue(value, field);
    return compareValues(fieldValue, threshold, (fieldValue, threshold) => {
      return fieldValue < threshold;
    });
  }

  if (isEqRule(rule)) {
    const [field, expected] = rule.eq;
    return getFieldValue(value, field) === expected;
  }

  if (isNeqRule(rule)) {
    const [field, expected] = rule.neq;
    return getFieldValue(value, field) !== expected;
  }

  if (isInRule(rule)) {
    const [item, field] = rule.in;
    const list = getFieldValue(value, field);
    return Array.isArray(list) && list.includes(item);
  }

  if (isContainsRule(rule)) {
    const [field, item] = rule.contains;
    const list = getFieldValue(value, field);
    return Array.isArray(list) && list.includes(item);
  }

  if (isExistsRule(rule)) {
    const [field] = rule.exists;
    return typeof field === "string" && getFieldValue(value, field) != null;
  }

  if (isAndRule(rule)) {
    return rule.and.every((subRule) => evaluateExpr(subRule, value));
  }

  if (isOrRule(rule)) {
    return rule.or.some((subRule) => evaluateExpr(subRule, value));
  }

  if (isNotRule(rule)) {
    return !evaluateExpr(rule.not, value);
  }

  return false;
}

export const engine: DecisionEngine = {
  evaluateExpr,
};
