import { staticDecisionDataAdapter } from "./adapters/static-data.ts";
import { engine } from "./engine.ts";
import { rules } from "./rule.ts";

type DebtSolutionRecommendation = "Useful Guide" | "IVA" | "DMP";

const debtDecisionInput = {
  vulcanId: "VUL-12345",
  creditProfile: {
    surplus: 125,
    totalUnsecuredDebt: 12000,
  },
  creditSearch: {
    totalLinesOfCredit: 4,
  },
  decisionInputs: {
    repaymentTermYears: 8,
  },
};

function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message ?? "Assert failed");
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    message ??
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

const usefulGuideRule = rules.or(
  rules.lt("creditProfile.surplus", 35),
  rules.lt("creditProfile.totalUnsecuredDebt", 3000),
  rules.lte("creditSearch.totalLinesOfCredit", 1),
);

const ivaRule = rules.and(
  rules.gte("creditProfile.surplus", 50),
  rules.gte("creditProfile.totalUnsecuredDebt", 6000),
  rules.gte("decisionInputs.repaymentTermYears", 4.9),
);

const dmpRule = rules.and(
  rules.gte("creditProfile.surplus", 35),
  rules.gte("creditProfile.totalUnsecuredDebt", 3000),
  rules.not(ivaRule),
);

console.dir(ivaRule, { depth: null });

assertEqual(usefulGuideRule, {
  or: [
    { lt: ["creditProfile.surplus", 35] },
    { lt: ["creditProfile.totalUnsecuredDebt", 3000] },
    { lte: ["creditSearch.totalLinesOfCredit", 1] },
  ],
});

assertEqual(ivaRule, {
  and: [
    { gte: ["creditProfile.surplus", 50] },
    { gte: ["creditProfile.totalUnsecuredDebt", 6000] },
    { gte: ["decisionInputs.repaymentTermYears", 4.9] },
  ],
});

const ivaRequest = staticDecisionDataAdapter.toDecisionRequest({
  rule: ivaRule,
  input: debtDecisionInput,
});

assert(engine.evaluateExpr(ivaRequest.rule, ivaRequest.input));
assert(
  recommendDebtSolution({
    ...debtDecisionInput,
    creditProfile: {
      surplus: 20,
      totalUnsecuredDebt: 12000,
    },
  }) === "Useful Guide",
);
assert(
  recommendDebtSolution({
    ...debtDecisionInput,
    creditProfile: {
      surplus: 125,
      totalUnsecuredDebt: 12000,
    },
  }) === "IVA",
);
assert(
  recommendDebtSolution({
    ...debtDecisionInput,
    creditProfile: {
      surplus: 100,
      totalUnsecuredDebt: 4000,
    },
    decisionInputs: {
      repaymentTermYears: 3.3,
    },
  }) === "DMP",
);

function recommendDebtSolution(
  input: typeof debtDecisionInput,
): DebtSolutionRecommendation {
  if (engine.evaluateExpr(usefulGuideRule, input)) {
    return "Useful Guide";
  }

  if (engine.evaluateExpr(ivaRule, input)) {
    return "IVA";
  }

  if (engine.evaluateExpr(dmpRule, input)) {
    return "DMP";
  }

  return "Useful Guide";
}

console.log(recommendDebtSolution(debtDecisionInput)); // IVA
