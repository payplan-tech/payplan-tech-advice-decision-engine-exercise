import { rules } from "../../../rule.ts";
import { incomingEdges, validateGraph } from "./validation";
import type { CompileResult, RuleGraph, RuleGraphNode } from "./types";
import type { Rule } from "../../../rule.ts";

export function compileRuleGraph(graph: RuleGraph): CompileResult {
  const validation = validateGraph(graph);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  const resultNode = graph.nodes.find((node) => node.type === "result");
  if (!resultNode) {
    return {
      success: false,
      errors: ["Graph needs one result node."],
      warnings: validation.warnings,
    };
  }

  const incoming = incomingEdges(graph, resultNode.id);
  if (incoming.length !== 1) {
    return {
      success: false,
      errors: ["Result node needs exactly one input."],
      warnings: validation.warnings,
    };
  }

  const compiled = compileNode(graph, incoming[0].sourceId, new Set());
  if (!compiled.success) {
    return {
      ...compiled,
      warnings: [...validation.warnings, ...compiled.warnings],
    };
  }

  return {
    success: true,
    rule: compiled.rule,
    warnings: validation.warnings,
  };
}

function compileNode(
  graph: RuleGraph,
  nodeId: string,
  path: Set<string>,
): CompileResult {
  if (path.has(nodeId)) {
    return {
      success: false,
      errors: [`Cycle detected at ${nodeId}.`],
      warnings: [],
    };
  }

  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return {
      success: false,
      errors: [`Missing source node ${nodeId}.`],
      warnings: [],
    };
  }

  path.add(nodeId);

  switch (node.type) {
    case "condition":
      return compileCondition(node);
    case "logic":
      return compileLogic(graph, node, path);
    case "input":
    case "note":
    case "result":
      return {
        success: false,
        errors: [`${node.name} cannot be compiled as a rule.`],
        warnings: [],
      };
    default: {
      const exhaustive: never = node;
      return {
        success: false,
        errors: [`Unknown node: ${String(exhaustive)}`],
        warnings: [],
      };
    }
  }
}

function compileCondition(
  node: Extract<RuleGraphNode, { type: "condition" }>,
): CompileResult {
  const { content } = node;

  switch (content.operator) {
    case "gte":
      return successfulRule(rules.gte(content.field, content.value));
    case "lte":
      return successfulRule(rules.lte(content.field, content.value));
    case "gt":
      return successfulRule(rules.gt(content.field, content.value));
    case "lt":
      return successfulRule(rules.lt(content.field, content.value));
    case "eq":
      return successfulRule(rules.eq(content.field, content.value));
    case "neq":
      return successfulRule(rules.neq(content.field, content.value));
    case "in":
      return successfulRule(rules.in(content.item, content.field));
    case "contains":
      return successfulRule(rules.contains(content.field, content.item));
    case "exists":
      return successfulRule(rules.exists(content.field));
    default: {
      const exhaustive: never = content;
      return {
        success: false,
        errors: [`Unknown condition: ${String(exhaustive)}`],
        warnings: [],
      };
    }
  }
}

function compileLogic(
  graph: RuleGraph,
  node: Extract<RuleGraphNode, { type: "logic" }>,
  path: Set<string>,
): CompileResult {
  const childResults = incomingEdges(graph, node.id).map((edge) =>
    compileNode(graph, edge.sourceId, new Set(path)),
  );
  const errors = childResults.flatMap((result) =>
    result.success ? [] : result.errors,
  );
  const warnings = childResults.flatMap((result) => result.warnings);

  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    };
  }

  const childRules = childResults.map((result) => {
    if (!result.success) {
      throw new Error("Failed child compile result was not filtered.");
    }
    return result.rule;
  });

  switch (node.content.operator) {
    case "and":
      return successfulRule(rules.and(...childRules), warnings);
    case "or":
      return successfulRule(rules.or(...childRules), warnings);
    case "not":
      return childRules.length === 1
        ? successfulRule(rules.not(childRules[0]), warnings)
        : {
            success: false,
            errors: ["NOT nodes must have exactly one input."],
            warnings,
          };
    default: {
      const exhaustive: never = node.content.operator;
      return {
        success: false,
        errors: [`Unknown logic operator: ${String(exhaustive)}`],
        warnings,
      };
    }
  }
}

function successfulRule(rule: Rule, warnings: string[] = []): CompileResult {
  return {
    success: true,
    rule,
    warnings,
  };
}
