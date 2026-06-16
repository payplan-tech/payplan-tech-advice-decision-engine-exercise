import { useState } from "react";
import "reactflow/dist/style.css";

import "./App.css";
import { EvaluatorPanel } from "./components/EvaluatorPanel";
import { NodeInspector } from "./components/NodeInspector";
import { RuleCanvas } from "./components/RuleCanvas";
import { defaultSampleJson, initialRuleGraph } from "./rule-graph/sample";
import type { RuleGraph, RuleGraphNode } from "./rule-graph/types";

function App() {
  const [graph, setGraph] = useState<RuleGraph>(initialRuleGraph);
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    "condition-age",
  );

  const addNode = (type: RuleGraphNode["type"]) => {
    const id = `${type}-${crypto.randomUUID()}`;
    setGraph((currentGraph) => {
      const node = createNode(type, id, currentGraph.nodes);

      return {
        ...currentGraph,
        nodes: [...currentGraph.nodes, node],
      };
    });
    setSelectedNodeId(id);
  };

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Rules engine GUI prototype</p>
          <h1>Rule Canvas</h1>
        </div>
        <p>
          Compose nodes visually, compile them to the existing rule AST, and
          evaluate against sample input.
        </p>
      </header>

      <div className="workspace">
        <RuleCanvas
          graph={graph}
          selectedNodeId={selectedNodeId}
          onAddNode={addNode}
          onGraphChange={setGraph}
          onSelectedNodeChange={setSelectedNodeId}
        />
        <NodeInspector
          graph={graph}
          selectedNodeId={selectedNodeId}
          onGraphChange={setGraph}
        />
        <EvaluatorPanel graph={graph} />
      </div>
    </main>
  );
}

const nodeStartPositions: Record<RuleGraphNode["type"], { x: number; y: number }> = {
  input: { x: 0, y: 80 },
  condition: { x: 280, y: 0 },
  logic: { x: 600, y: 0 },
  result: { x: 880, y: 0 },
  note: { x: 0, y: 340 },
};

const nodeColumnWidth = 220;
const nodeRowHeight = 140;
const nodeCollisionHeight = 120;

function createNode(
  type: RuleGraphNode["type"],
  id: string,
  existingNodes: RuleGraphNode[],
): RuleGraphNode {
  const position = findOpenPosition(type, existingNodes);

  switch (type) {
    case "input":
      return {
        id,
        type,
        name: "Input",
        position,
        content: {
          sampleJson: defaultSampleJson,
          schemaMode: "infer-from-sample",
          fields: [],
        },
      };
    case "condition":
      return {
        id,
        type,
        name: "Condition",
        position,
        content: {
          operator: "eq",
          field: "role",
          value: "admin",
        },
      };
    case "logic":
      return {
        id,
        type,
        name: "Logic",
        position,
        content: {
          operator: "and",
        },
      };
    case "result":
      return {
        id,
        type,
        name: "Result",
        position,
        content: {
          label: "Decision result",
        },
      };
    case "note":
      return {
        id,
        type,
        name: "Note",
        position,
        content: {
          text: "Document the rule here.",
        },
      };
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function findOpenPosition(
  type: RuleGraphNode["type"],
  existingNodes: RuleGraphNode[],
) {
  const startPosition = nodeStartPositions[type];
  let nextY = startPosition.y;

  while (
    existingNodes.some(
      (node) =>
        Math.abs(node.position.x - startPosition.x) < nodeColumnWidth &&
        Math.abs(node.position.y - nextY) < nodeCollisionHeight,
    )
  ) {
    nextY += nodeRowHeight;
  }

  return {
    x: startPosition.x,
    y: nextY,
  };
}

export default App;
