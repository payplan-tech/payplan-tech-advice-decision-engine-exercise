import type { DecisionInputPort, DecisionRequest } from "../ports.ts";
import type { Rule } from "../rule.ts";

export type StaticDecisionData = {
  rule: Rule;
  input: Record<string, unknown>;
};

export const staticDecisionDataAdapter: DecisionInputPort<StaticDecisionData> = {
  toDecisionRequest(raw: StaticDecisionData): DecisionRequest {
    return {
      rule: raw.rule,
      input: raw.input,
    };
  },
};
