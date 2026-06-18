import type { LexerPort } from "./ports.ts";

export type TokenType =
  | "identifier"
  | "number"
  | "string"
  | "gte"
  | "lte"
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "and"
  | "or"
  | "in"
  | "not"
  | "lparen"
  | "rparen"
  | "dot"
  | "eof";

export type Token = {
  type: TokenType;
  /** Lexeme text, or parsed value for numbers/strings. */
  value: string | number;
  offset: number;
  length: number;
};

export class LexError extends Error {
  offset: number;

  constructor(message: string, offset: number) {
    super(`${message} at position ${offset}`);
    this.name = "LexError";
    this.offset = offset;
  }
}

const KEYWORDS: Record<string, TokenType> = {
  and: "and",
  or: "or",
  in: "in",
  not: "not",
};

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentifierStart(char: string): boolean {
  return (
    (char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_"
  );
}

function isIdentifierPart(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char);
}

function skipWhitespace(source: string, offset: number): number {
  while (offset < source.length) {
    const char = source[offset];
    if (char === " " || char === "\t" || char === "\n" || char === "\r") {
      offset += 1;
      continue;
    }
    break;
  }
  return offset;
}

function readString(
  source: string,
  start: number,
): { token: Token; next: number } {
  const quote = source[start];
  let value = "";
  let offset = start + 1;

  while (offset < source.length) {
    const char = source[offset];
    if (char === quote) {
      return {
        token: {
          type: "string",
          value,
          offset: start,
          length: offset - start + 1,
        },
        next: offset + 1,
      };
    }

    if (char === "\\") {
      const next = source[offset + 1];
      if (next === undefined) {
        throw new LexError("Unterminated escape sequence in string", offset);
      }
      switch (next) {
        case "n":
          value += "\n";
          break;
        case "t":
          value += "\t";
          break;
        case "\\":
          value += "\\";
          break;
        case '"':
          value += '"';
          break;
        case "'":
          value += "'";
          break;
        default:
          value += next;
          break;
      }
      offset += 2;
      continue;
    }

    value += char;
    offset += 1;
  }

  throw new LexError("Unterminated string literal", start);
}

function readNumber(
  source: string,
  start: number,
): { token: Token; next: number } {
  let offset = start;

  while (offset < source.length && isDigit(source[offset])) {
    offset += 1;
  }

  if (source[offset] === ".") {
    const afterDot = source[offset + 1];
    if (afterDot !== undefined && isDigit(afterDot)) {
      offset += 1;
      while (offset < source.length && isDigit(source[offset])) {
        offset += 1;
      }
    }
  }

  const lexeme = source.slice(start, offset);
  const value = Number(lexeme);
  if (Number.isNaN(value)) {
    throw new LexError(`Invalid number "${lexeme}"`, start);
  }

  return {
    token: {
      type: "number",
      value,
      offset: start,
      length: offset - start,
    },
    next: offset,
  };
}

function readIdentifier(
  source: string,
  start: number,
): { token: Token; next: number } {
  let offset = start + 1;
  while (offset < source.length && isIdentifierPart(source[offset])) {
    offset += 1;
  }

  const lexeme = source.slice(start, offset);
  const keyword = KEYWORDS[lexeme];
  const type = keyword ?? "identifier";

  return {
    token: {
      type,
      value: lexeme,
      offset: start,
      length: offset - start,
    },
    next: offset,
  };
}

function readOperator(
  source: string,
  start: number,
): { token: Token; next: number } {
  const char = source[start];
  const next = source[start + 1];

  if (char === ">") {
    if (next === "=") {
      return {
        token: { type: "gte", value: ">=", offset: start, length: 2 },
        next: start + 2,
      };
    }
    return {
      token: { type: "gt", value: ">", offset: start, length: 1 },
      next: start + 1,
    };
  }

  if (char === "<") {
    if (next === "=") {
      return {
        token: { type: "lte", value: "<=", offset: start, length: 2 },
        next: start + 2,
      };
    }
    return {
      token: { type: "lt", value: "<", offset: start, length: 1 },
      next: start + 1,
    };
  }

  if (char === "=" && next === "=") {
    return {
      token: { type: "eq", value: "==", offset: start, length: 2 },
      next: start + 2,
    };
  }

  if (char === "!" && next === "=") {
    return {
      token: { type: "neq", value: "!=", offset: start, length: 2 },
      next: start + 2,
    };
  }

  throw new LexError(`Unexpected character "${char}"`, start);
}

function readToken(
  source: string,
  offset: number,
): { token: Token; next: number } {
  const char = source[offset];

  if (char === '"' || char === "'") {
    return readString(source, offset);
  }

  if (isDigit(char)) {
    return readNumber(source, offset);
  }

  if (isIdentifierStart(char)) {
    return readIdentifier(source, offset);
  }

  if (char === "(") {
    return {
      token: { type: "lparen", value: "(", offset, length: 1 },
      next: offset + 1,
    };
  }

  if (char === ")") {
    return {
      token: { type: "rparen", value: ")", offset, length: 1 },
      next: offset + 1,
    };
  }

  if (char === ".") {
    return {
      token: { type: "dot", value: ".", offset, length: 1 },
      next: offset + 1,
    };
  }

  if (char === ">" || char === "<" || char === "=" || char === "!") {
    return readOperator(source, offset);
  }

  throw new LexError(`Unexpected character "${char}"`, offset);
}

/** Scan `input` into a token stream, including a trailing `eof` token. */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;

  while (offset < input.length) {
    offset = skipWhitespace(input, offset);
    if (offset >= input.length) {
      break;
    }

    const { token, next } = readToken(input, offset);
    tokens.push(token);
    offset = next;
  }

  tokens.push({
    type: "eof",
    value: "",
    offset,
    length: 0,
  });

  return tokens;
}

/** Cursor over a pre-tokenized stream for use by a parser. */
export class Lexer implements LexerPort {
  private index = 0;
  private tokens: Token[];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  static from(input: string): Lexer {
    return new Lexer(tokenize(input));
  }

  peek(): Token {
    return this.tokens[this.index] ?? this.eofToken();
  }

  advance(): Token {
    const token = this.peek();
    if (token.type !== "eof") {
      this.index += 1;
    }
    return token;
  }

  isAtEnd(): boolean {
    return this.peek().type === "eof";
  }

  private eofToken(): Token {
    const last = this.tokens[this.tokens.length - 1];
    return {
      type: "eof",
      value: "",
      offset: last?.offset ?? 0,
      length: 0,
    };
  }

  toTokens(input: string): Token[] {
    return tokenize(input);
  }
}
