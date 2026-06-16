import { fieldTypeForPath, inferFields, parseJsonObject } from "./fields";
import type {
  FieldDefinition,
  NodeValidation,
  RuleGraph,
  RuleGraphEdge,
  RuleGraphNode,
} from "./types";

export function inputFieldsForGraph(graph: RuleGraph): FieldDefinition[] {
  const inputNode = graph.nodes.find((node) => node.type === "input");
  if (!inputNode || inputNode.type !== "input") {
    return [];
  }

  const parsed = parseJsonObject(inputNode.content.sampleJson);
  if (!parsed) {
    return inputNode.content.fields;
  }

  return inferFields(parsed);
}

export function validateNode(
  node: RuleGraphNode,
  graph: RuleGraph,
  fields = inputFieldsForGraph(graph),
): NodeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const incoming = incomingEdges(graph, node.id);

  switch (node.type) {
    case "input": {
      if (!parseJsonObject(node.content.sampleJson)) {
        errors.push("Input sample must be a valid JSON object.");
      }
      break;
    }
    case "condition": {
      const { content } = node;
      if (!content.field.trim()) {
        errors.push("Condition requires a field.");
      } else if (!fieldTypeForPath(fields, content.field)) {
        warnings.push(`${content.field} was not found in the current input sample.`);
      }

      if (incoming.length > 0) {
        errors.push("Condition nodes cannot have incoming rule edges.");
      }

      switch (content.operator) {
        case "gte":
        case "lte":
        case "gt":
        case "lt": {
          if (typeof content.value !== "number" || Number.isNaN(content.value)) {
            errors.push(`${content.operator} requires a numeric comparison value.`);
          }

          const type = fieldTypeForPath(fields, content.field);
          if (type && type !== "number") {
            warnings.push(`${content.field} is inferred as ${type}, not number.`);
          }
          break;
        }
        case "eq":
        case "neq":
          break;
        case "in":
        case "contains": {
          const type = fieldTypeForPath(fields, content.field);
          if (type && type !== "array") {
            warnings.push(`${content.operator} usually expects an array field.`);
          }
          break;
        }
        case "exists":
          break;
        default: {
          const exhaustive: never = content;
          errors.push(`Unknown condition: ${String(exhaustive)}`);
        }
      }
      break;
    }
    case "logic": {
      if (node.content.operator === "not" && incoming.length !== 1) {
        errors.push("NOT nodes must have exactly one input.");
      }

      if (node.content.operator !== "not" && incoming.length < 1) {
        errors.push(`${node.content.operator.toUpperCase()} nodes need at least one input.`);
      }
      break;
    }
    case "result": {
      if (incoming.length !== 1) {
        errors.push("Result node needs exactly one input.");
      }
      break;
    }
    case "note":
      break;
    default: {
      const exhaustive: never = node;
      errors.push(`Unknown node: ${String(exhaustive)}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateGraph(graph: RuleGraph): NodeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const resultNodes = graph.nodes.filter((node) => node.type === "result");
  const duplicateEdges = findDuplicateEdges(graph.edges);

  if (resultNodes.length !== 1) {
    errors.push("Graph needs exactly one result node.");
  }

  duplicateEdges.forEach((edge) => {
    errors.push(`Duplicate edge from ${edge.sourceId} to ${edge.targetId}.`);
  });

  graph.nodes.forEach((node) => {
    const validation = validateNode(node, graph);
    errors.push(...validation.errors.map((error) => `${node.name}: ${error}`));
    warnings.push(...validation.warnings.map((warning) => `${node.name}: ${warning}`));
  });

  if (hasCycle(graph)) {
    errors.push("Graph cannot contain cycles.");
  }

  disconnectedExecutableNodes(graph).forEach((node) => {
    warnings.push(`${node.name} is not connected to the result.`);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function incomingEdges(graph: RuleGraph, nodeId: string): RuleGraphEdge[] {
  return graph.edges.filter((edge) => edge.targetId === nodeId);
}

export function outgoingEdges(graph: RuleGraph, nodeId: string): RuleGraphEdge[] {
  return graph.edges.filter((edge) => edge.sourceId === nodeId);
}

export function executableNodes(graph: RuleGraph): RuleGraphNode[] {
  return graph.nodes.filter((node) => node.type === "condition" || node.type === "logic");
}

function findDuplicateEdges(edges: RuleGraphEdge[]): RuleGraphEdge[] {
  const seen = new Set<string>();
  const duplicates: RuleGraphEdge[] = [];

  edges.forEach((edge) => {
    const key = [
      edge.sourceId,
      edge.targetId,
      edge.sourceHandle ?? "",
      edge.targetHandle ?? "",
    ].join(":");
    if (seen.has(key)) {
      duplicates.push(edge);
      return;
    }

    seen.add(key);
  });

  return duplicates;
}

function hasCycle(graph: RuleGraph): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(nodeId: string): boolean {
    if (visiting.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visiting.add(nodeId);
    for (const edge of outgoingEdges(graph, nodeId)) {
      if (visit(edge.targetId)) {
        return true;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  }

  return graph.nodes.some((node) => visit(node.id));
}

function disconnectedExecutableNodes(graph: RuleGraph): RuleGraphNode[] {
  const resultNode = graph.nodes.find((node) => node.type === "result");
  if (!resultNode) {
    return [];
  }

  const connected = new Set<string>();

  function walkBack(nodeId: string): void {
    incomingEdges(graph, nodeId).forEach((edge) => {
      connected.add(edge.sourceId);
      walkBack(edge.sourceId);
    });
  }

  walkBack(resultNode.id);

  return executableNodes(graph).filter((node) => !connected.has(node.id));
}
