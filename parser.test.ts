import { engine } from "./engine.ts";
import { ParseError, parse } from "./parser.ts";
import { rules } from "./rule.ts";

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

assertEqual(parse("age >= 18"), { gte: ["age", 18] });
assertEqual(parse("age <= 65"), { lte: ["age", 65] });
assertEqual(parse('role == "admin"'), { eq: ["role", "admin"] });
assertEqual(parse('role != "guest"'), { neq: ["role", "guest"] });
assertEqual(parse('"write" in permissions'), { in: ["write", "permissions"] });

assertEqual(parse('age >= 18 and role == "admin"'), {
  and: [{ gte: ["age", 18] }, { eq: ["role", "admin"] }],
});

assertEqual(parse("surplus > 0"), { gt: ["surplus", 0] });
assertEqual(parse("surplus < 35"), { lt: ["surplus", 35] });

assertEqual(parse('address.city == "London"'), {
  eq: ["address.city", "London"],
});

assertEqual(parse("decisionInputs.repaymentTermYears >= 4.9"), {
  gte: ["decisionInputs.repaymentTermYears", 4.9],
});

assertEqual(parse("a >= 1 or b >= 2"), {
  or: [{ gte: ["a", 1] }, { gte: ["b", 2] }],
});

assertEqual(
  parse('(age >= 18 or role == "superadmin") and "write" in permissions'),
  {
    and: [
      {
        or: [{ gte: ["age", 18] }, { eq: ["role", "superadmin"] }],
      },
      { in: ["write", "permissions"] },
    ],
  },
);

assertEqual(parse('not role == "guest"'), {
  not: { eq: ["role", "guest"] },
});

const decisionInput = {
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

const ivaEligible = rules.and(
  rules.gte("creditProfile.surplus", 50),
  rules.gte("creditProfile.totalUnsecuredDebt", 6000),
  rules.gte("decisionInputs.repaymentTermYears", 4.9),
);

const parsedIva = parse(
  "creditProfile.surplus >= 50 and creditProfile.totalUnsecuredDebt >= 6000 and decisionInputs.repaymentTermYears >= 4.9",
);

assertEqual(parsedIva, ivaEligible);
assert(engine.evaluateExpr(parsedIva, decisionInput));

let threw = false;
try {
  parse("age >=");
} catch (error) {
  threw = error instanceof ParseError;
}
assert(threw, "Expected incomplete comparison to throw ParseError");

threw = false;
try {
  parse('role == "admin" and');
} catch (error) {
  threw = error instanceof ParseError;
}
assert(threw, "Expected trailing and to throw ParseError");

console.log("parser tests passed");
