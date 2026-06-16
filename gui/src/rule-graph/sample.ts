import type { RuleGraph } from "./types";

export const defaultSampleInput = {
  vulcanId: "VUL-12345",
  creditProfile: {
    surplus: 125,
    totalUnsecuredDebt: 12000,
  },
  creditSearch: {
    totalLinesOfCredit: 4,
  },
  debts: {
    creditorNames: ["Example Bank", "Example Card"],
  },
  decisionInputs: {
    repaymentTermYears: 8,
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
      id: "condition-surplus",
      type: "condition",
      name: "Surplus at least GBP 50",
      position: { x: 280, y: 0 },
      content: {
        operator: "gte",
        field: "creditProfile.surplus",
        value: 50,
      },
    },
    {
      id: "condition-debt",
      type: "condition",
      name: "Debt at least GBP 6,000",
      position: { x: 280, y: 140 },
      content: {
        operator: "gte",
        field: "creditProfile.totalUnsecuredDebt",
        value: 6000,
      },
    },
    {
      id: "condition-repayment-term",
      type: "condition",
      name: "Repayment term at least 4.9 years",
      position: { x: 280, y: 280 },
      content: {
        operator: "gte",
        field: "decisionInputs.repaymentTermYears",
        value: 4.9,
      },
    },
    {
      id: "logic-iva",
      type: "logic",
      name: "IVA eligibility",
      position: { x: 600, y: 140 },
      content: {
        operator: "and",
      },
    },
    {
      id: "result-recommendation",
      type: "result",
      name: "Result",
      position: { x: 880, y: 140 },
      content: {
        label: "Recommend IVA?",
      },
    },
    {
      id: "note-1",
      type: "note",
      name: "Note",
      position: { x: 0, y: 340 },
      content: {
        text: "AD-28 branch example. Useful Guide is the priority branch when surplus < 35, total unsecured debt < 3000, or total lines of credit <= 1. DMP applies when surplus >= 35 and debt >= 3000 after the IVA branch fails.",
      },
    },
  ],
  edges: [
    {
      id: "edge-input-surplus",
      sourceId: "input-1",
      targetId: "condition-surplus",
    },
    {
      id: "edge-input-debt",
      sourceId: "input-1",
      targetId: "condition-debt",
    },
    {
      id: "edge-input-repayment-term",
      sourceId: "input-1",
      targetId: "condition-repayment-term",
    },
    {
      id: "edge-surplus-iva",
      sourceId: "condition-surplus",
      targetId: "logic-iva",
    },
    {
      id: "edge-debt-iva",
      sourceId: "condition-debt",
      targetId: "logic-iva",
    },
    {
      id: "edge-repayment-term-iva",
      sourceId: "condition-repayment-term",
      targetId: "logic-iva",
    },
    {
      id: "edge-iva-result",
      sourceId: "logic-iva",
      targetId: "result-recommendation",
    },
  ],
};
