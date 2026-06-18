import { LexError, tokenize } from "./lexer.ts";

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

function tokenTypes(input: string): string[] {
  return tokenize(input)
    .filter((token) => token.type !== "eof")
    .map((token) => token.type);
}

function tokenValues(input: string): Array<string | number> {
  return tokenize(input)
    .filter((token) => token.type !== "eof")
    .map((token) => token.value);
}

assertEqual(tokenTypes('age >= 18'), [
  "identifier",
  "gte",
  "number",
]);

assertEqual(tokenTypes('role == "admin"'), [
  "identifier",
  "eq",
  "string",
]);

assertEqual(tokenValues('role == "admin"'), ["role", "==", "admin"]);

assertEqual(tokenTypes('role != "guest"'), [
  "identifier",
  "neq",
  "string",
]);

assertEqual(tokenTypes('"write" in permissions'), [
  "string",
  "in",
  "identifier",
]);

assertEqual(tokenValues('"write" in permissions'), ["write", "in", "permissions"]);

assertEqual(
  tokenTypes('age >= 18 and role == "admin"'),
  ["identifier", "gte", "number", "and", "identifier", "eq", "string"],
);

assertEqual(tokenTypes("a or b"), ["identifier", "or", "identifier"]);

assertEqual(tokenTypes("age <= 65"), ["identifier", "lte", "number"]);

assertEqual(tokenTypes("surplus > 0"), ["identifier", "gt", "number"]);

assertEqual(tokenTypes("surplus < 35"), ["identifier", "lt", "number"]);

assertEqual(tokenTypes("not banned"), ["not", "identifier"]);

assertEqual(
  tokenTypes('(age >= 18 or role == "superadmin") and "write" in permissions'),
  [
    "lparen",
    "identifier",
    "gte",
    "number",
    "or",
    "identifier",
    "eq",
    "string",
    "rparen",
    "and",
    "string",
    "in",
    "identifier",
  ],
);

assertEqual(tokenTypes("address.city == \"London\""), [
  "identifier",
  "dot",
  "identifier",
  "eq",
  "string",
]);

assertEqual(tokenValues("decisionInputs.repaymentTermYears >= 4.9"), [
  "decisionInputs",
  ".",
  "repaymentTermYears",
  ">=",
  4.9,
]);

let threw = false;
try {
  tokenize('role == "admin');
} catch (error) {
  threw = error instanceof LexError;
  assert(error instanceof LexError);
  assertEqual(error.offset, 8);
}
assert(threw, "Expected unterminated string to throw LexError");

threw = false;
try {
  tokenize("age @ 5");
} catch (error) {
  threw = error instanceof LexError;
}
assert(threw, "Expected unknown character to throw LexError");

console.log("lexer tests passed");
