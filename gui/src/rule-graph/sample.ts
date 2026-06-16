import type { RuleGraph } from "./types";

export const defaultSampleInput = {
  name: "John Doe",
  age: 28,
  role: "admin",
  email: "john@company.com",
  permissions: ["read", "write", "delete"],
  account: {
    status: "active",
    permissions: ["read", "write"],
    loginCount: 12,
    deletedAt: null,
  },
};

export const defaultSampleJson = JSON.stringify(defaultSampleInput, null, 2);

export const initialRuleGraph: RuleGraph = {
  nodes: [
    {
      id: "input-1",
      type: "input",
      name: "Input",
      position: { x: 0, y: 80 },
      content: {
        sampleJson: defaultSampleJson,
        schemaMode: "infer-from-sample",
        fields: [],
      },
    },
    {
      id: "condition-age",
      type: "condition",
      name: "Age check",
      position: { x: 280, y: 0 },
      content: {
        operator: "gte",
        field: "age",
        value: 18,
      },
    },
    {
      id: "condition-role",
      type: "condition",
      name: "Role check",
      position: { x: 280, y: 140 },
      content: {
        operator: "eq",
        field: "role",
        value: "admin",
      },
    },
    {
      id: "condition-permission",
      type: "condition",
      name: "Permission check",
      position: { x: 280, y: 280 },
      content: {
        operator: "in",
        item: "write",
        field: "permissions",
      },
    },
    {
      id: "logic-and",
      type: "logic",
      name: "All checks",
      position: { x: 600, y: 140 },
      content: {
        operator: "and",
      },
    },
    {
      id: "result-access",
      type: "result",
      name: "Result",
      position: { x: 880, y: 140 },
      content: {
        label: "Can access?",
      },
    },
    {
      id: "note-1",
      type: "note",
      name: "Note",
      position: { x: 0, y: 340 },
      content: {
        text: "Build rules left to right. Notes do not compile.",
      },
    },
  ],
  edges: [
    {
      id: "edge-age-and",
      sourceId: "condition-age",
      targetId: "logic-and",
    },
    {
      id: "edge-role-and",
      sourceId: "condition-role",
      targetId: "logic-and",
    },
    {
      id: "edge-permission-and",
      sourceId: "condition-permission",
      targetId: "logic-and",
    },
    {
      id: "edge-and-result",
      sourceId: "logic-and",
      targetId: "result-access",
    },
  ],
};
