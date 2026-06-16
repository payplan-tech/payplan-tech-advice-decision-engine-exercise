import { useState } from "react";
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
  canCompletePendingConnection: boolean;
  pendingConnectionSourceId?: string;
  onCancelConnection: () => void;
  onCompleteConnection: (targetId: string) => void;
  onStartConnection: (sourceId: string) => void;
};

const nodeTypes = {
  ruleNode: RuleNode,
};

const ruleNodeDimensions: Record<RuleGraphNode["type"], { width: number; height: number }> = {
  input: { width: 190, height: 100 },
  condition: { width: 190, height: 86 },
  logic: { width: 190, height: 86 },
  result: { width: 190, height: 86 },
  note: { width: 190, height: 100 },
};

export function RuleCanvas({
  graph,
  selectedNodeId,
  onGraphChange,
  onSelectedNodeChange,
  onAddNode,
}: RuleCanvasProps) {
  const [pendingConnectionSourceId, setPendingConnectionSourceId] = useState<
    string | undefined
  >();

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
    const removedIds = changes
      .filter((change) => change.type === "remove")
      .map((change) => change.id);
    const hasPositionChange = changes.some(
      (change) => change.type === "position" && change.position,
    );

    if (removedIds.length > 0) {
      onGraphChange({
        nodes: graph.nodes.filter((node) => !removedIds.includes(node.id)),
        edges: graph.edges.filter(
          (edge) =>
            !removedIds.includes(edge.sourceId) &&
            !removedIds.includes(edge.targetId),
        ),
      });
      return;
    }

    if (hasPositionChange) {
      updateFromFlowNodes(applyNodeChanges(changes, flowNodes));
    }
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

    if (!canConnectNodes(sourceNode, targetNode)) {
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

  const addGraphEdge = (sourceId: string | undefined, targetId: string) => {
    const connection: Connection = {
      source: sourceId ?? null,
      target: targetId,
      sourceHandle: null,
      targetHandle: null,
    };

    if (!isValidConnection(connection)) {
      return;
    }

    onGraphChange({
      ...graph,
      edges: [
        ...graph.edges,
        {
          id: crypto.randomUUID(),
          sourceId: sourceId ?? "",
          targetId,
        },
      ],
    });
    setPendingConnectionSourceId(undefined);
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

  const flowNodes = graph.nodes.map((node) =>
    graphNodeToFlowNode(node, graph, {
      onCancelConnection: () => setPendingConnectionSourceId(undefined),
      onCompleteConnection: (targetId) => {
        addGraphEdge(pendingConnectionSourceId, targetId);
      },
      onStartConnection: (sourceId) => setPendingConnectionSourceId(sourceId),
      pendingConnectionSourceId,
      selectedNodeId,
    }),
  );

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
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          isValidConnection={isValidConnection}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => onSelectedNodeChange(node.id)}
          onNodesChange={onNodesChange}
          onPaneClick={() => onSelectedNodeChange(undefined)}
        >
          <Background gap={20} />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}

function graphNodeToFlowNode(
  node: RuleGraphNode,
  graph: RuleGraph,
  options: {
    pendingConnectionSourceId?: string;
    selectedNodeId?: string;
    onCancelConnection: () => void;
    onCompleteConnection: (targetId: string) => void;
    onStartConnection: (sourceId: string) => void;
  },
): Node<RuleFlowData> {
  const dimensions = ruleNodeDimensions[node.type];
  const pendingConnectionSource = graph.nodes.find(
    (candidate) => candidate.id === options.pendingConnectionSourceId,
  );

  return {
    id: node.id,
    type: "ruleNode",
    position: node.position,
    width: dimensions.width,
    height: dimensions.height,
    selected: node.id === options.selectedNodeId,
    data: {
      graphNode: node,
      canCompletePendingConnection: pendingConnectionSource
        ? pendingConnectionSource.id !== node.id &&
          canConnectNodes(pendingConnectionSource, node)
        : false,
      onCancelConnection: options.onCancelConnection,
      onCompleteConnection: options.onCompleteConnection,
      onStartConnection: options.onStartConnection,
      pendingConnectionSourceId: options.pendingConnectionSourceId,
      validation: validateNode(node, graph),
    },
  };
}

function RuleNode({ data, selected }: NodeProps<RuleFlowData>) {
  const {
    canCompletePendingConnection,
    graphNode,
    onCancelConnection,
    onCompleteConnection,
    onStartConnection,
    pendingConnectionSourceId,
    validation,
  } = data;
  const canReceive =
    graphNode.type === "condition" ||
    graphNode.type === "logic" ||
    graphNode.type === "result";
  const canSend =
    graphNode.type === "input" ||
    graphNode.type === "condition" ||
    graphNode.type === "logic";
  const isPendingConnectionSource = pendingConnectionSourceId === graphNode.id;

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
      <div className="rule-node-actions">
        {canSend && (
          <button
            type="button"
            className="rule-node-link-button"
            onClick={(event) => {
              event.stopPropagation();
              if (isPendingConnectionSource) {
                onCancelConnection();
                return;
              }

              onStartConnection(graphNode.id);
            }}
          >
            {isPendingConnectionSource ? "Cancel link" : "Link from"}
          </button>
        )}
        {canCompletePendingConnection && (
          <button
            type="button"
            className="rule-node-link-button rule-node-link-button-primary"
            onClick={(event) => {
              event.stopPropagation();
              onCompleteConnection(graphNode.id);
            }}
          >
            Connect here
          </button>
        )}
      </div>
      {canSend && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

function canConnectNodes(sourceNode: RuleGraphNode, targetNode: RuleGraphNode): boolean {
  if (sourceNode.type === "input") {
    return targetNode.type === "condition";
  }

  const sourceCanConnect =
    sourceNode.type === "condition" || sourceNode.type === "logic";
  const targetCanConnect =
    targetNode.type === "logic" || targetNode.type === "result";

  return sourceCanConnect && targetCanConnect;
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
