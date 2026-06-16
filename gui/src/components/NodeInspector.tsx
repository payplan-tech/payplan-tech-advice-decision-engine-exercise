import { conditionOperators } from "../rule-graph/types";
import { inputFieldsForGraph, validateNode } from "../rule-graph/validation";
import type {
  ConditionNodeContent,
  ConditionOperator,
  FieldDefinition,
  RuleGraph,
  RuleGraphNode,
  ScalarValue,
} from "../rule-graph/types";

type NodeInspectorProps = {
  graph: RuleGraph;
  selectedNodeId?: string;
  onGraphChange: (graph: RuleGraph) => void;
};

export function NodeInspector({
  graph,
  selectedNodeId,
  onGraphChange,
}: NodeInspectorProps) {
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId);
  const fields = inputFieldsForGraph(graph);

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p>Select a node to edit its configuration.</p>
      </aside>
    );
  }

  const validation = validateNode(selectedNode, graph, fields);

  return (
    <aside className="inspector">
      <h2>Inspector</h2>
      <label>
        Name
        <input
          value={selectedNode.name}
          onChange={(event) =>
            updateNode(graph, selectedNode.id, onGraphChange, {
              ...selectedNode,
              name: event.target.value,
            })
          }
        />
      </label>

      {renderNodeEditor(selectedNode, graph, fields, onGraphChange)}

      <div className="validation-box">
        <strong>Validation</strong>
        {validation.errors.length === 0 && validation.warnings.length === 0 && (
          <p>Ready to compile.</p>
        )}
        {validation.errors.map((error) => (
          <p className="error" key={error}>
            {error}
          </p>
        ))}
        {validation.warnings.map((warning) => (
          <p className="warning" key={warning}>
            {warning}
          </p>
        ))}
      </div>
    </aside>
  );
}

function renderNodeEditor(
  node: RuleGraphNode,
  graph: RuleGraph,
  fields: FieldDefinition[],
  onGraphChange: (graph: RuleGraph) => void,
) {
  switch (node.type) {
    case "input":
      return (
        <>
          <label>
            Sample input JSON
            <textarea
              rows={12}
              value={node.content.sampleJson}
              onChange={(event) =>
                updateNode(graph, node.id, onGraphChange, {
                  ...node,
                  content: {
                    ...node.content,
                    sampleJson: event.target.value,
                  },
                })
              }
            />
          </label>
          <div className="field-list">
            <strong>Inferred fields</strong>
            {fields.map((field) => (
              <span key={field.path}>
                {field.path}: {field.type}
              </span>
            ))}
          </div>
        </>
      );
    case "condition":
      return (
        <ConditionEditor
          fields={fields}
          graph={graph}
          node={node}
          onGraphChange={onGraphChange}
        />
      );
    case "logic":
      return (
        <label>
          Logic operator
          <select
            value={node.content.operator}
            onChange={(event) =>
              updateNode(graph, node.id, onGraphChange, {
                ...node,
                content: {
                  operator: event.target.value as "and" | "or" | "not",
                },
              })
            }
          >
            <option value="and">AND</option>
            <option value="or">OR</option>
            <option value="not">NOT</option>
          </select>
        </label>
      );
    case "result":
      return (
        <label>
          Result label
          <input
            value={node.content.label}
            onChange={(event) =>
              updateNode(graph, node.id, onGraphChange, {
                ...node,
                content: {
                  label: event.target.value,
                },
              })
            }
          />
        </label>
      );
    case "note":
      return (
        <label>
          Note
          <textarea
            rows={6}
            value={node.content.text}
            onChange={(event) =>
              updateNode(graph, node.id, onGraphChange, {
                ...node,
                content: {
                  text: event.target.value,
                },
              })
            }
          />
        </label>
      );
    default: {
      const exhaustive: never = node;
      return <p>Unknown node: {String(exhaustive)}</p>;
    }
  }
}

function ConditionEditor({
  fields,
  graph,
  node,
  onGraphChange,
}: {
  fields: FieldDefinition[];
  graph: RuleGraph;
  node: Extract<RuleGraphNode, { type: "condition" }>;
  onGraphChange: (graph: RuleGraph) => void;
}) {
  const updateContent = (content: ConditionNodeContent) => {
    updateNode(graph, node.id, onGraphChange, {
      ...node,
      content,
    });
  };

  return (
    <>
      <label>
        Operator
        <select
          value={node.content.operator}
          onChange={(event) =>
            updateContent(defaultConditionForOperator(event.target.value as ConditionOperator))
          }
        >
          {conditionOperators.map((operator) => (
            <option value={operator} key={operator}>
              {operator}
            </option>
          ))}
        </select>
      </label>

      <FieldInput
        fields={fields}
        label="Field"
        value={node.content.field}
        onChange={(field) => updateContent({ ...node.content, field })}
      />

      {renderConditionValue(node.content, updateContent)}
    </>
  );
}

function renderConditionValue(
  content: ConditionNodeContent,
  onChange: (content: ConditionNodeContent) => void,
) {
  switch (content.operator) {
    case "gte":
    case "lte":
    case "gt":
    case "lt":
      return (
        <label>
          Value
          <input
            type="number"
            value={content.value}
            onChange={(event) =>
              onChange({
                ...content,
                value: Number(event.target.value),
              })
            }
          />
        </label>
      );
    case "eq":
    case "neq":
      return (
        <ScalarEditor
          label="Value"
          value={content.value}
          onChange={(value) => onChange({ ...content, value })}
        />
      );
    case "in":
      return (
        <ScalarEditor
          label="Item"
          value={content.item}
          onChange={(item) => onChange({ ...content, item })}
        />
      );
    case "contains":
      return (
        <ScalarEditor
          label="Item"
          value={content.item}
          onChange={(item) => onChange({ ...content, item })}
        />
      );
    case "exists":
      return null;
    default: {
      const exhaustive: never = content;
      return <p>Unknown condition: {String(exhaustive)}</p>;
    }
  }
}

function FieldInput({
  fields,
  label,
  value,
  onChange,
}: {
  fields: FieldDefinition[];
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input
        list="field-options"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id="field-options">
        {fields.map((field) => (
          <option key={field.path} value={field.path}>
            {field.type}
          </option>
        ))}
      </datalist>
    </label>
  );
}

function ScalarEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ScalarValue;
  onChange: (value: ScalarValue) => void;
}) {
  const valueType =
    value === null ? "null" : typeof value === "boolean" ? "boolean" : typeof value;

  return (
    <div className="scalar-editor">
      <label>
        {label} type
        <select
          value={valueType}
          onChange={(event) => onChange(defaultScalar(event.target.value))}
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="null">Null</option>
        </select>
      </label>

      {valueType === "boolean" ? (
        <label>
          {label}
          <select
            value={String(value)}
            onChange={(event) => onChange(event.target.value === "true")}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
      ) : valueType === "null" ? (
        <p>{label}: null</p>
      ) : (
        <label>
          {label}
          <input
            type={valueType === "number" ? "number" : "text"}
            value={String(value)}
            onChange={(event) =>
              onChange(
                valueType === "number"
                  ? Number(event.target.value)
                  : event.target.value,
              )
            }
          />
        </label>
      )}
    </div>
  );
}

function defaultConditionForOperator(
  operator: ConditionOperator,
): ConditionNodeContent {
  switch (operator) {
    case "gte":
    case "lte":
    case "gt":
    case "lt":
      return { operator, field: "age", value: 18 };
    case "eq":
    case "neq":
      return { operator, field: "role", value: "admin" };
    case "in":
      return { operator, item: "write", field: "permissions" };
    case "contains":
      return { operator, field: "permissions", item: "write" };
    case "exists":
      return { operator, field: "email" };
    default: {
      const exhaustive: never = operator;
      return exhaustive;
    }
  }
}

function defaultScalar(type: string): ScalarValue {
  switch (type) {
    case "number":
      return 0;
    case "boolean":
      return true;
    case "null":
      return null;
    case "string":
    default:
      return "";
  }
}

function updateNode(
  graph: RuleGraph,
  nodeId: string,
  onGraphChange: (graph: RuleGraph) => void,
  updatedNode: RuleGraphNode,
) {
  onGraphChange({
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? updatedNode : node)),
  });
}
