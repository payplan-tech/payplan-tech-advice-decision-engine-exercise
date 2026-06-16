# Rules Engine — Team TypeScript Exercise

A practical exercise for the team to build together. The goal is to get hands-on with TypeScript and understand how rules engines work — a pattern we use (or will use) for authorization, validation, and business logic that shouldn't be buried in `if` chains.

Work through this on your own first. Ask questions in the channel, pair if you're stuck, and bring your solution to review. A reference implementation is in [`main.ts`](./main.ts) — hold off on reading it until you've given the baseline a proper go.

## Why this exercise

- **TypeScript** — modeling data with types, generics, narrowing `unknown`, recursive types
- **Design** — separating rule *definition* (data) from rule *evaluation* (logic)
- **A real pattern** — rules engines show up in auth, pricing, feature flags, and workflow tooling; understanding the basics makes those systems less mysterious

## What to build

Given a data object and a declarative rule, return whether the rule passes. The
sample domain mirrors AD-27/AD-28: Vulcan I&E and debt data is normalized before
the rule engine recommends a debt-solution branch.

Implement:

1. A `Rule` type that represents conditions as plain objects
2. A `rules` helper API to construct rules without hand-writing JSON
3. An `engine` that evaluates a rule against any object

## Sample data

```ts
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
```

## Required operators

| Operator | Rule shape | Semantics |
|----------|------------|-----------|
| `gte` | `{ gte: [field, value] }` | `data[field] >= value` |
| `eq` | `{ eq: [field, value] }` | `data[field] === value` |
| `in` | `{ in: [item, field] }` | `item` is in `data[field]` (array) |
| `and` | `{ and: Rule[] }` | every sub-rule passes |

## Target API

```ts
const ivaEligible = rules.and(
  rules.gte("creditProfile.surplus", 50),
  rules.gte("creditProfile.totalUnsecuredDebt", 6000),
  rules.gte("decisionInputs.repaymentTermYears", 4.9),
);

engine.evaluateExpr(ivaEligible, decisionInput); // true
```

Helpers should produce the equivalent of hand-written rule objects:

```ts
rules.and(
  rules.gte("creditProfile.surplus", 50),
  rules.gte("creditProfile.totalUnsecuredDebt", 6000),
);
// -> { and: [{ gte: ["creditProfile.surplus", 50] }, { gte: ["creditProfile.totalUnsecuredDebt", 6000] }] }
```

## Requirements

- TypeScript throughout
- `evaluateExpr(rule, value)` accepts `Record<string, unknown>` — the engine must work with any object, not just `user`
- Invalid or unrecognized rules return `false`
- Include basic assertions that verify helpers build the correct structures and the evaluator returns the right results
- No external dependencies

## Acceptance criteria

Your solution should pass these cases:

```ts
engine.evaluateExpr(rules.lt("creditProfile.surplus", 35), decisionInput)                 // false
engine.evaluateExpr(rules.gte("creditProfile.totalUnsecuredDebt", 6000), decisionInput)    // true
engine.evaluateExpr(rules.lte("creditSearch.totalLinesOfCredit", 1), decisionInput)        // false

engine.evaluateExpr(
  rules.and(
    rules.gte("creditProfile.surplus", 50),
    rules.gte("creditProfile.totalUnsecuredDebt", 6000),
    rules.gte("decisionInputs.repaymentTermYears", 4.9),
  ),
  decisionInput,
); // true
```

Changing `decisionInputs.repaymentTermYears` below `4.9` should make the IVA
rule fail. The category order is Useful Guide first, then IVA, then DMP.

## How to approach it

1. **Start from scratch** in your own file (`solution.ts`, or a branch) — don't fork `main.ts` upfront
2. **Get the types right first** — sketch `Rule` before writing evaluator logic
3. **Build helpers, then the engine** — confirm helpers produce the right objects before evaluating
4. **Run it** — `node your-file.ts` (Node 22.18+ runs `.ts` natively via type stripping)
5. **Compare** — diff against [`main.ts`](./main.ts) once your baseline passes. Differences are fine; be ready to explain your choices in review

There's no single correct structure. Focus on readable types, clear evaluation logic, and tests that prove it works.


## Reference solution

[`main.ts`](./main.ts) — a working baseline covering the required operators, helpers, assertions, and evaluator. Use it to unblock yourself or to compare approaches after you've finished.

---

## Follow-on exercises

Pick these up once the baseline is done — on your own, or as a focused second session. Each extends the same codebase.

### 1. Improve the `Rule` type

The baseline uses optional properties on a single object. TypeScript can't stop someone from writing `{ gte: [...], eq: [...] }` at compile time.

**Task:** Redesign `Rule` so each rule has exactly one operator. Refactor helpers and `evaluateExpr` to match.

**Worth exploring:**
- Discriminated unions (`type Rule = GteRule | EqRule | ...`)
- An `evaluateExpr` that exhaustively switches on rule kind (use a `never` check in `default`)
- Whether helpers should return narrow types (`GteRule` vs `Rule`)

**Stretch:** Type field names against a schema so `rules.gte("foo", 18)` is a compile error when `foo` isn't a known key.

---

### 2. More operators

Extend the engine. For each operator: update the type, add a helper, handle it in the evaluator, add tests.

| Operator | Syntax | Semantics |
|----------|--------|-----------|
| `lte` | `rules.lte("age", 65)` | `data[field] <= value` |
| `lt` / `gt` | `rules.lt(...)`, `rules.gt(...)` | strict comparisons |
| `neq` | `rules.neq("status", "banned")` | `data[field] !== value` |
| `or` | `rules.or(a, b, c)` | any sub-rule passes |
| `not` | `rules.not(rule)` | negates a sub-rule |
| `contains` | `rules.contains("permissions", "write")` | clearer argument order than `in` |
| `exists` | `rules.exists("email")` | field is present and not `null` / `undefined` |

**Worth discussing in review:**
- Evaluation order for `and` vs `or` — does it matter? Should you short-circuit?
- What should happen when `gte` hits a missing field or a non-numeric value?

---

### 3. Evaluation results, not just booleans

Change the return type from `boolean` to something richer:

```ts
type EvalResult =
  | { success: true }
  | { success: false; reason: string; path?: string[] };
```

**Task:** When a rule fails, return *why* — e.g. `"age 16 < 18"`, `"role 'guest' !== 'admin'"`, `"'admin' not in permissions"`.

For `and` / `or`, decide whether you return the first failure, all failures, or a tree of results. Document the choice.

---

### 4. Rule parser — string expressions to `Rule` objects

The helper API is fine for code, but rules are often written as strings — especially when non-engineers configure them:

```
age >= 18 and role == "admin" and "write" in permissions
```

**Task:** Build `parse(input: string): Rule` that converts a string expression into your `Rule` AST.

**Minimum syntax:**

| Expression | Maps to |
|------------|---------|
| `age >= 18` | `{ gte: ["age", 18] }` |
| `age <= 65` | `{ lte: ["age", 65] }` |
| `role == "admin"` | `{ eq: ["role", "admin"] }` |
| `role != "guest"` | `{ neq: ["role", "guest"] }` |
| `"write" in permissions` | `{ in: ["write", "permissions"] }` |
| `a and b` | `{ and: [a, b] }` |
| `a or b` | `{ or: [a, b] }` |

**Worth exploring:**
- Tokenizer — identifiers, operators, strings, numbers, keywords (`and`, `or`, `in`)
- Parser — recursive descent or Pratt; define operator precedence (`and` vs `or`) and document it
- Error messages — `age >=` with no value, unclosed quotes, unknown operators

**Example:**

```ts
const rule = parse('age >= 18 and role == "admin"');
engine.evaluateExpr(rule, user); // true
```

**Stretch:**
- Parentheses: `(age >= 18 or role == "superadmin") and "write" in permissions`
- Unary `not`: `not banned == true`
- Dot paths: `address.city == "London"`
- Evaluate without building an AST — what do you gain or lose?

---

### 5. End-to-end: rules from a config file

Load named rules from JSON and evaluate them against incoming data.

```json
[
  { "name": "is-adult", "expr": "age >= 18" },
  { "name": "is-admin", "expr": "role == \"admin\"" },
  { "name": "can-write", "expr": "\"write\" in permissions" }
]
```

**Task:** Parse each `expr`, evaluate against a record, return `{ name, passed }[]` or only the failures.

This pulls together the parser, evaluator, and the production pattern: **rules as data, not code**.
