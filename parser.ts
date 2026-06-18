import type { Token, TokenType } from "./lexer.ts";
import { Lexer as LexerImpl } from "./lexer.ts";
import type { LexerPort } from "./ports.ts";
import type { Rule } from "./rule.ts";

export class ParseError extends Error {
  offset: number;

  constructor(message: string, offset: number) {
    super(`${message} at position ${offset}`);
    this.name = "ParseError";
    this.offset = offset;
  }
}

const COMPARISON_OPS = new Set<TokenType>([
  "gte",
  "lte",
  "eq",
  "neq",
  "gt",
  "lt",
]);

type ComparisonOp = "gte" | "lte" | "eq" | "neq" | "gt" | "lt";

export class Parser {
  private lexer: LexerPort;

  constructor(lexer: LexerPort) {
    this.lexer = lexer;
  }

  parse(): Rule {
    const rule = this.parseOr();
    if (!this.lexer.isAtEnd()) {
      const token = this.lexer.peek();
      throw new ParseError(`Unexpected token "${token.value}"`, token.offset);
    }
    return rule;
  }

  private parseOr(): Rule {
    const parts: Rule[] = [this.parseAnd()];

    while (this.lexer.peek().type === "or") {
      this.lexer.advance();
      parts.push(this.parseAnd());
    }

    return parts.length === 1 ? parts[0] : { or: parts };
  }

  private parseAnd(): Rule {
    const parts: Rule[] = [this.parseUnary()];

    while (this.lexer.peek().type === "and") {
      this.lexer.advance();
      parts.push(this.parseUnary());
    }

    return parts.length === 1 ? parts[0] : { and: parts };
  }

  private parseUnary(): Rule {
    if (this.lexer.peek().type === "not") {
      this.lexer.advance();
      return { not: this.parseUnary() };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Rule {
    const token = this.lexer.peek();

    if (token.type === "lparen") {
      this.lexer.advance();
      const expr = this.parseOr();
      this.expect("rparen", "Expected ')' after expression");
      return expr;
    }

    if (token.type === "string" || token.type === "number") {
      const item = this.lexer.advance().value;
      if (this.lexer.peek().type === "in") {
        this.lexer.advance();
        const field = this.parsePath();
        return { in: [item, field] };
      }
      throw new ParseError(
        `Expected "in" after literal, got "${this.lexer.peek().value}"`,
        this.lexer.peek().offset,
      );
    }

    if (token.type === "identifier") {
      return this.parseComparison();
    }

    throw new ParseError(`Unexpected token "${token.value}"`, token.offset);
  }

  private parseComparison(): Rule {
    const field = this.parsePath();
    const opToken = this.lexer.peek();

    if (!COMPARISON_OPS.has(opToken.type)) {
      throw new ParseError(
        `Expected comparison operator after "${field}"`,
        opToken.offset,
      );
    }

    const op = opToken.type as ComparisonOp;
    this.lexer.advance();
    const value = this.parseValue();
    return { [op]: [field, value] } as Rule;
  }

  private parsePath(): string {
    const start = this.lexer.peek();
    if (start.type !== "identifier") {
      throw new ParseError("Expected field name", start.offset);
    }

    let path = String(this.lexer.advance().value);

    while (this.lexer.peek().type === "dot") {
      this.lexer.advance();
      const segment = this.lexer.peek();
      if (segment.type !== "identifier") {
        throw new ParseError("Expected identifier after '.'", segment.offset);
      }
      path += `.${this.lexer.advance().value}`;
    }

    return path;
  }

  private parseValue(): string | number {
    const token = this.lexer.peek();
    if (token.type === "string" || token.type === "number") {
      return this.lexer.advance().value as string | number;
    }

    throw new ParseError("Expected string or number literal", token.offset);
  }

  private expect(type: TokenType, message: string): Token {
    const token = this.lexer.peek();
    if (token.type !== type) {
      throw new ParseError(message, token.offset);
    }
    return this.lexer.advance();
  }
}

/** Parse a rule expression string into a `Rule` AST. `and` binds tighter than `or`. */
export function parse(input: string): Rule {
  return new Parser(LexerImpl.from(input)).parse();
}
