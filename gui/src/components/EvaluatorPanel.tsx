import { engine } from "../../../engine.ts";
import { compileRuleGraph } from "../rule-graph/compile";
import { parseJsonObject } from "../rule-graph/fields";
import {
  inputFieldsForGraph,
  inputNodesConnectedToResult,
  validateGraph,
} from "../rule-graph/validation";
import type { RuleGraph } from "../rule-graph/types";

type EvaluatorPanelProps = {
  graph: RuleGraph;
};

export function EvaluatorPanel({ graph }: EvaluatorPanelProps) {
  const validation = validateGraph(graph);
  const compiled = compileRuleGraph(graph);
  const connectedInputNodes = inputNodesConnectedToResult(graph);
  const inputNode =
    connectedInputNodes.length === 1 ? connectedInputNodes[0] : undefined;
  const sampleInput =
    inputNode?.type === "input" ? parseJsonObject(inputNode.content.sampleJson) : null;
  const result =
    compiled.success && sampleInput
      ? engine.evaluateExpr(compiled.rule, sampleInput)
      : undefined;
  const fields = inputFieldsForGraph(graph);

  return (
    <aside className="evaluator">
      <h2>Evaluator</h2>

      <section>
        <h3>Compiled Rule JSON</h3>
        <pre>
          {compiled.success
            ? JSON.stringify(compiled.rule, null, 2)
            : compiled.errors.join("\n")}
        </pre>
      </section>

      <section>
        <h3>Sample Input</h3>
        <pre>
          {sampleInput
            ? JSON.stringify(sampleInput, null, 2)
            : sampleInputMessage(connectedInputNodes.length)}
        </pre>
      </section>

      <section>
        <h3>Evaluation</h3>
        <div className={`result-pill ${result === true ? "pass" : "fail"}`}>
          {result === undefined ? "Not ready" : String(result)}
        </div>
      </section>

      <section>
        <h3>Graph Health</h3>
        {validation.errors.length === 0 && <p>No blocking errors.</p>}
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
      </section>

      <section>
        <h3>Parser Status</h3>
        <p>
          Text expressions are intentionally deferred. The canvas compiles
          directly to the engine rule object model.
        </p>
      </section>

      <section>
        <h3>Available Fields</h3>
        <div className="field-list">
          {fields.map((field) => (
            <span key={field.path}>
              {field.path}: {field.type}
            </span>
          ))}
        </div>
      </section>
    </aside>
  );
}

function sampleInputMessage(connectedInputCount: number): string {
  if (connectedInputCount === 0) {
    return "Connect an input node into the result path to evaluate.";
  }

  if (connectedInputCount > 1) {
    return "Result path has multiple connected input nodes. Connect exactly one input.";
  }

  return "Connected input node must contain a JSON object.";
}
