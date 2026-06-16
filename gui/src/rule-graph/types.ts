import type { Rule } from "../../../rule.ts";

export type FieldType =
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "null"
  | "unknown";

export type FieldDefinition = {
  path: string;
  type: FieldType;
};

export type ScalarValue = string | number | boolean | null;

export type ComparisonOperator = "gte" | "lte" | "gt" | "lt";
export type EqualityOperator = "eq" | "neq";
export type ArrayOperator = "in" | "contains";
export type ExistenceOperator = "exists";
export type ConditionOperator =
  | ComparisonOperator
  | EqualityOperator
  | ArrayOperator
  | ExistenceOperator;

export type InputNodeContent = {
  sampleJson: string;
  schemaMode: "infer-from-sample" | "manual";
  fields: FieldDefinition[];
};

export type ConditionNodeContent =
  | { operator: ComparisonOperator; field: string; value: number }
  | { operator: EqualityOperator; field: string; value: ScalarValue }
  | { operator: "in"; item: ScalarValue; field: string }
  | { operator: "contains"; field: string; item: ScalarValue }
  | { operator: "exists"; field: string };

export type LogicNodeContent = {
  operator: "and" | "or" | "not";
};

export type ResultNodeContent = {
  label: string;
};

export type NoteNodeContent = {
  text: string;
};

export type RuleGraphNode =
  | {
      id: string;
      type: "input";
      name: string;
      position: { x: number; y: number };
      content: InputNodeContent;
    }
  | {
      id: string;
      type: "condition";
      name: string;
      position: { x: number; y: number };
      content: ConditionNodeContent;
    }
  | {
      id: string;
      type: "logic";
      name: string;
      position: { x: number; y: number };
      content: LogicNodeContent;
    }
  | {
      id: string;
      type: "result";
      name: string;
      position: { x: number; y: number };
      content: ResultNodeContent;
    }
  | {
      id: string;
      type: "note";
      name: string;
      position: { x: number; y: number };
      content: NoteNodeContent;
    };

export type RuleGraphEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type RuleGraph = {
  nodes: RuleGraphNode[];
  edges: RuleGraphEdge[];
};

export type NodeValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type CompileResult =
  | { success: true; rule: Rule; warnings: string[] }
  | { success: false; errors: string[]; warnings: string[] };

export const comparisonOperators: ComparisonOperator[] = [
  "gte",
  "lte",
  "gt",
  "lt",
];

export const conditionOperators: ConditionOperator[] = [
  "gte",
  "lte",
  "gt",
  "lt",
  "eq",
  "neq",
  "in",
  "contains",
  "exists",
];
