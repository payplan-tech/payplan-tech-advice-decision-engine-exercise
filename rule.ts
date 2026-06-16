export type GteRule = {
  gte: [string, unknown];
};

export type EqRule = { eq: [string, unknown] };

export type InRule = {
  in: [unknown, string];
};

export type AndRule = {
  and: Rule[];
};

export type Rule = GteRule | EqRule | InRule | AndRule;

export const rules = {
  gte(ident: string, value: unknown): Rule {
    return {
      gte: [ident, value],
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

export const isEqRule = (rule: Rule): rule is EqRule => {
  return "eq" in rule;
};

export const isInRule = (rule: Rule): rule is InRule => {
  return "in" in rule;
};

export const isAndRule = (rule: Rule): rule is AndRule => {
  return "and" in rule;
};
