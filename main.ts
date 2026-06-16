import { staticDecisionDataAdapter } from "./adapters/static-data.ts";
import { engine } from "./engine.ts";
import { rules } from "./rule.ts";

const user = {
  name: "John Doe",
  age: 28,
  role: "admin",
  email: "john@company.com",
  permissions: ["read", "write", "delete"],
  account: {
    status: "active",
    permissions: ["read", "write"],
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

const isAdult = rules.gte("age", 18);

console.log(isAdult);

const canAccess = rules.and(
  rules.gte("age", 18),
  rules.eq("role", "admin"),
  rules.in("write", "permissions"),
);

const canAccessAccount = rules.and(
  rules.eq("account.status", "active"),
  rules.in("write", "account.permissions"),
);

console.dir(canAccessAccount, { depth: null });

assertEqual(isAdult, { gte: ["age", 18] });

assertEqual(canAccess, {
  and: [
    { gte: ["age", 18] },
    { eq: ["role", "admin"] },
    { in: ["write", "permissions"] },
  ],
});

const accessRequest = staticDecisionDataAdapter.toDecisionRequest({
  rule: canAccess,
  input: user,
});

assert(engine.evaluateExpr(isAdult, user));
assert(engine.evaluateExpr(rules.eq("role", "guest"), user) === false);
assert(engine.evaluateExpr(rules.in("write", "permissions"), user));
assert(engine.evaluateExpr(rules.in("admin", "permissions"), user) === false);
assert(engine.evaluateExpr(canAccessAccount, user));
assert(
  engine.evaluateExpr(rules.eq("account.status", "disabled"), user) === false,
);

console.log(engine.evaluateExpr(accessRequest.rule, accessRequest.input)); // true
