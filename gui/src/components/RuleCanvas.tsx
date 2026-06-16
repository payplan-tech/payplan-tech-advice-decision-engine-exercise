import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnConnect,
} from "reactflow";

import { validateNode } from "../rule-graph/validation";
import type { NodeValidation, RuleGraph, RuleGraphNode } from "../rule-graph/types";

type RuleCanvasProps = {
  graph: RuleGraph;
  selectedNodeId?: string;
  onGraphChange: (graph: RuleGraph) => void;
  onSelectedNodeChange: (nodeId?: string) => void;
  onAddNode: (type: RuleGraphNode["type"]) => void;
};

type RuleFlowData = {
  graphNode: RuleGraphNode;
  validation: NodeValidation;
};

const nodeTypes = {
  ruleNode: RuleNode,
};

export function RuleCanvas({
  graph,
  selectedNodeId,
  onGraphChange,
  onSelectedNodeChange,
  onAddNode,
}: RuleCanvasProps) {
  const nodes: Node<RuleFlowData>[] = graph.nodes.map((node) => ({
    id: node.id,
    type: "ruleNode",
    position: node.position,
    selected: node.id === selectedNodeId,
    data: {
      graphNode: node,
      validation: validateNode(node, graph),
    },
  }));

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    animated: true,
  }));

  const updateFromFlowNodes = (updatedNodes: Node[]) => {
    onGraphChange({
      ...graph,
      nodes: graph.nodes.map((graphNode) => {
        const flowNode = updatedNodes.find((node) => node.id === graphNode.id);
        return flowNode
          ? { ...graphNode, position: flowNode.position }
          : graphNode;
      }),
    });
  };

  const updateFromFlowEdges = (updatedEdges: Edge[]) => {
    onGraphChange({
      ...graph,
      edges: updatedEdges.map((edge) => ({
        id: edge.id,
        sourceId: edge.source,
        targetId: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      })),
    });
  };

  const onNodesChange = (changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, nodes);
    const removedIds = changes
      .filter((change) => change.type === "remove")
      .map((change) => change.id);

    onGraphChange({
      nodes: graph.nodes
        .filter((node) => !removedIds.includes(node.id))
        .map((graphNode) => {
          const flowNode = updatedNodes.find((node) => node.id === graphNode.id);
          return flowNode
            ? { ...graphNode, position: flowNode.position }
            : graphNode;
        }),
      edges: graph.edges.filter(
        (edge) =>
          !removedIds.includes(edge.sourceId) &&
          !removedIds.includes(edge.targetId),
      ),
    });
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    const updatedEdges = applyEdgeChanges(changes, edges);
    updateFromFlowEdges(updatedEdges);
  };

  const isValidConnection = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return false;
    }

    if (connection.source === connection.target) {
      return false;
    }

    const sourceNode = graph.nodes.find((node) => node.id === connection.source);
    const targetNode = graph.nodes.find((node) => node.id === connection.target);

    if (!sourceNode || !targetNode) {
      return false;
    }

    const sourceCanConnect =
      sourceNode.type === "condition" || sourceNode.type === "logic";
    const targetCanConnect =
      targetNode.type === "logic" || targetNode.type === "result";

    if (!sourceCanConnect || !targetCanConnect) {
      return false;
    }

    return !graph.edges.some(
      (edge) =>
        edge.sourceId === connection.source &&
        edge.targetId === connection.target &&
        (edge.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
        (edge.targetHandle ?? null) === (connection.targetHandle ?? null),
    );
  };

  const onConnect: OnConnect = (connection) => {
    if (!isValidConnection(connection)) {
      return;
    }

    const updatedEdges = addEdge(
      {
        ...connection,
        id: crypto.randomUUID(),
        animated: true,
      },
      edges,
    );
    updateFromFlowEdges(updatedEdges);
  };

  return (
    <section className="canvas-shell">
      <aside className="palette">
        <h2>Nodes</h2>
        <button type="button" onClick={() => onAddNode("condition")}>
          Condition
        </button>
        <button type="button" onClick={() => onAddNode("logic")}>
          Logic
        </button>
        <button type="button" onClick={() => onAddNode("result")}>
          Result
        </button>
        <button type="button" onClick={() => onAddNode("input")}>
          Input
        </button>
        <button type="button" onClick={() => onAddNode("note")}>
          Note
        </button>
      </aside>

      <div className="canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          isValidConnection={isValidConnection}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => onSelectedNodeChange(node.id)}
          onNodesChange={onNodesChange}
          onPaneClick={() => onSelectedNodeChange(undefined)}
          onNodeDragStop={(_, __, updatedNodes) => updateFromFlowNodes(updatedNodes)}
        >
          <Background gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}

function RuleNode({ data, selected }: NodeProps<RuleFlowData>) {
  const { graphNode, validation } = data;
  const canReceive = graphNode.type === "logic" || graphNode.type === "result";
  const canSend = graphNode.type === "condition" || graphNode.type === "logic";

  return (
    <div
      className={[
        "rule-node",
        `rule-node-${graphNode.type}`,
        selected ? "rule-node-selected" : "",
        validation.valid ? "" : "rule-node-invalid",
      ].join(" ")}
    >
      {canReceive && <Handle type="target" position={Position.Left} />}
      <div className="rule-node-kind">{graphNode.type}</div>
      <strong>{graphNode.name}</strong>
      <p>{nodeSummary(graphNode)}</p>
      {validation.errors.length > 0 && (
        <small>{validation.errors[0]}</small>
      )}
      {canSend && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

function nodeSummary(node: RuleGraphNode): string {
  switch (node.type) {
    case "input":
      return "Sample input and field discovery";
    case "condition":
      return conditionSummary(node.content);
    case "logic":
      return node.content.operator.toUpperCase();
    case "result":
      return node.content.label;
    case "note":
      return node.content.text;
    default: {
      const exhaustive: never = node;
      return String(exhaustive);
    }
  }
}

function conditionSummary(content: Extract<RuleGraphNode, { type: "condition" }>["content"]): string {
  switch (content.operator) {
    case "gte":
      return `${content.field} >= ${content.value}`;
    case "lte":
      return `${content.field} <= ${content.value}`;
    case "gt":
      return `${content.field} > ${content.value}`;
    case "lt":
      return `${content.field} < ${content.value}`;
    case "eq":
      return `${content.field} == ${JSON.stringify(content.value)}`;
    case "neq":
      return `${content.field} != ${JSON.stringify(content.value)}`;
    case "in":
      return `${JSON.stringify(content.item)} in ${content.field}`;
    case "contains":
      return `${content.field} contains ${JSON.stringify(content.item)}`;
    case "exists":
      return `exists ${content.field}`;
    default: {
      const exhaustive: never = content;
      return String(exhaustive);
    }
  }
}
