const user = {
  name: "John Doe",
  age: 28,
  role: "admin",
  email: "john@company.com",
  permissions: ["read", "write", "delete"],
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

type Rule = {
  gte?: [string, unknown];
  eq?: [string, unknown];
  in?: [unknown, string];
  and?: Rule[];
};

const rules = {
  gte(ident: string, value: unknown): Rule {
    return {
      gte: [ident, value],
    };
  },

  and(...arguments: Rule[]): Rule {
    return {
      and: [...arguments],
    };
  },

  eq(ident: string, value: unknown): Rule {
    return {
      eq: [ident, value],
    };
  },

  in(item: unknown, field: string): Rule {
    return {
      in: [item, field],
    };
  },
};

const isAdult = rules.gte("age", 18);

console.log(isAdult);

const canAccess = rules.and(
  rules.gte("age", 18),
  rules.eq("role", "admin"),
  rules.in("write", "permissions"),
);

assertEqual(isAdult, { gte: ["age", 18] });

assertEqual(canAccess, {
  and: [
    { gte: ["age", 18] },
    { eq: ["role", "admin"] },
    { in: ["write", "permissions"] },
  ],
});

const engine = {
  evaluateExpr(rule: Rule, value: Record<string, unknown>) {
    if (rule.gte) {
      const [field, threshold] = rule.gte;
      const fieldValue = value[field];
      return typeof fieldValue === "number" && typeof threshold === "number"
        ? fieldValue >= threshold
        : Number(fieldValue) >= Number(threshold);
    }
    if (rule.eq) {
      const [field, expected] = rule.eq;
      return value[field] === expected;
    }
    if (rule.in) {
      const [item, field] = rule.in;
      const list = value[field];
      return Array.isArray(list) && list.includes(item);
    }
    if (rule.and) {
      return rule.and.every((subRule) => this.evaluateExpr(subRule, value));
    }
    return false;
  },
};

console.log(engine.evaluateExpr(canAccess, user)); // true
