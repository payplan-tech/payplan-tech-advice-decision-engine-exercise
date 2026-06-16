export type Rule = {
  gte?: [string, unknown];
  eq?: [string, unknown];
  in?: [unknown, string];
  and?: Rule[];
};

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
