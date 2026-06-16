export type GteRule = {
  gte: [string, unknown];
};

export type LteRule = {
  lte: [string, unknown];
};

export type LtRule = {
  lt: [string, unknown];
};

export type GtRule = {
  gt: [string, unknown];
};

export type EqRule = { eq: [string, unknown] };

export type InRule = {
  in: [unknown, string];
};

export type AndRule = {
  and: Rule[];
};

export type NeqRule = {
  neq: [string, unknown];
};

export type OrRule = {
  or: Rule[];
};

export type NotRule = {
  not: Rule;
};

export type ContainsRule = {
  contains: [string, unknown];
};

export type ExistsRule = {
  exists: [unknown];
};

export type Rule =
  | GteRule
  | LteRule
  | EqRule
  | InRule
  | AndRule
  | GtRule
  | LtRule
  | NeqRule
  | OrRule
  | NotRule
  | ContainsRule
  | ExistsRule;

export const rules = {
  gte(ident: string, value: unknown): Rule {
    return {
      gte: [ident, value],
    };
  },

  lte(ident: string, value: unknown): Rule {
    return {
      lte: [ident, value],
    };
  },

  lt(ident: string, value: unknown): Rule {
    return {
      lt: [ident, value],
    };
  },

  gt(ident: string, value: unknown): Rule {
    return {
      gt: [ident, value],
    };
  },

  neq(ident: string, value: unknown): Rule {
    return {
      neq: [ident, value],
    };
  },

  or(...rules: Rule[]): Rule {
    return {
      or: [...rules],
    };
  },

  not(rule: Rule): Rule {
    return {
      not: rule,
    };
  },

  contains(ident: string, value: unknown): Rule {
    return {
      contains: [ident, value],
    };
  },

  exists(value: unknown): Rule {
    return {
      exists: [value],
    };
  },

  and(...rules: Rule[]): Rule {
    return {
      and: [...rules],
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

export const isGteRule = (rule: Rule): rule is GteRule => {
  return "gte" in rule;
};

export const isLteRule = (rule: Rule): rule is LteRule => {
  return "lte" in rule;
};

export const isLtRule = (rule: Rule): rule is LtRule => {
  return "lt" in rule;
};

export const isGtRule = (rule: Rule): rule is GtRule => {
  return "gt" in rule;
};

export const isEqRule = (rule: Rule): rule is EqRule => {
  return "eq" in rule;
};

export const isInRule = (rule: Rule): rule is InRule => {
  return "in" in rule;
};

export const isAndRule = (rule: Rule): rule is AndRule => {
  return "and" in rule;
};

export const isNeqRule = (rule: Rule): rule is NeqRule => {
  return "neq" in rule;
};

export const isOrRule = (rule: Rule): rule is OrRule => {
  return "or" in rule;
};

export const isNotRule = (rule: Rule): rule is NotRule => {
  return "not" in rule;
};

export const isContainsRule = (rule: Rule): rule is ContainsRule => {
  return "contains" in rule;
};

export const isExistsRule = (rule: Rule): rule is ExistsRule => {
  return "exists" in rule;
};
