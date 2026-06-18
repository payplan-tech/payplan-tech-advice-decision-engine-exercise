import type { Token } from "./lexer.ts";
import type { Rule } from "./rule.ts";

export type DecisionInput = Record<string, unknown>;

export type DecisionRequest = {
  rule: Rule;
  input: DecisionInput;
};

export type DecisionInputPort<Raw> = {
  toDecisionRequest(raw: Raw): DecisionRequest;
};

export type DecisionEngine = {
  evaluateExpr(rule: Rule, input: DecisionInput): boolean;
};

export type LexerPort = {
  toTokens(input: string): Token[];
  peek(): Token;
  advance(): Token;
  isAtEnd(): boolean;
};
