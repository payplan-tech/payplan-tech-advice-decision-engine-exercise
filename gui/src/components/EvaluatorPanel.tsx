import { engine } from "../../../engine.ts";
import { rules } from "../../../rule.ts";
import { compileRuleGraph } from "../rule-graph/compile";
import { parseJsonObject } from "../rule-graph/fields";
import {
  inputFieldsForGraph,
  inputNodesConnectedToResult,
  validateGraph,
} from "../rule-graph/validation";
import type { RuleGraph, RuleGraphNode } from "../rule-graph/types";

type EvaluatorPanelProps = {
  graph: RuleGraph;
  onGraphChange: (graph: RuleGraph) => void;
};

type DebtSolutionRecommendation = "Useful Guide" | "IVA" | "DMP";

const usefulGuideRule = rules.or(
  rules.lt("creditProfile.surplus", 35),
  rules.lt("creditProfile.totalUnsecuredDebt", 3000),
  rules.lte("creditSearch.totalLinesOfCredit", 1),
);

const ivaRule = rules.and(
  rules.gte("creditProfile.surplus", 50),
  rules.gte("creditProfile.totalUnsecuredDebt", 6000),
  rules.gte("decisionInputs.repaymentTermYears", 4.9),
);

const dmpRule = rules.and(
  rules.gte("creditProfile.surplus", 35),
  rules.gte("creditProfile.totalUnsecuredDebt", 3000),
  rules.not(usefulGuideRule),
  rules.not(ivaRule),
);

export function EvaluatorPanel({ graph, onGraphChange }: EvaluatorPanelProps) {
  const validation = validateGraph(graph);
  const compiled = compileRuleGraph(graph);
  const connectedInputNodes = inputNodesConnectedToResult(graph);
  const inputNode = inputNodeForEvaluation(graph, connectedInputNodes);
  const sampleInput =
    inputNode?.type === "input" ? parseJsonObject(inputNode.content.sampleJson) : null;
  const result =
    "rule" in compiled && sampleInput
      ? engine.evaluateExpr(compiled.rule, sampleInput)
      : undefined;
  const fields = inputFieldsForGraph(graph);
  const debtSolutionEvaluation = sampleInput
    ? evaluateDebtSolution(sampleInput)
    : undefined;
  const compiledRuleText = "rule" in compiled
    ? JSON.stringify(compiled.rule, null, 2)
    : compiled.errors.join("\n");

  return (
    <aside className="evaluator">
      <h2>Evaluator</h2>

      <section>
        <h3>Compiled Rule JSON</h3>
        <pre>{compiledRuleText}</pre>
      </section>

      <section>
        <h3>Sample Input</h3>
        {inputNode ? (
          <textarea
            rows={14}
            value={inputNode.content.sampleJson}
            onChange={(event) =>
              updateInputSample(graph, inputNode.id, event.target.value, onGraphChange)
            }
          />
        ) : (
          <pre>{sampleInputMessage(connectedInputNodes.length)}</pre>
        )}
      </section>

      <section>
        <h3>Canvas Rule Evaluation</h3>
        <div className={`result-pill ${result === true ? "pass" : "fail"}`}>
          {result === undefined ? "Not ready" : String(result)}
        </div>
      </section>

      <section>
        <h3>Debt Solution Branches</h3>
        {debtSolutionEvaluation ? (
          <>
            <div className="recommendation-card">
              Recommendation: {debtSolutionEvaluation.recommendation}
            </div>
            <div className="branch-list">
              {debtSolutionEvaluation.branches.map((branch) => (
                <div className="branch-row" key={branch.label}>
                  <span>{branch.label}</span>
                  <span className={`result-pill ${branch.passed ? "pass" : "fail"}`}>
                    {String(branch.passed)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p>Enter valid sample JSON to evaluate the AD-28 branches.</p>
        )}
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

function inputNodeForEvaluation(
  graph: RuleGraph,
  connectedInputNodes: Extract<RuleGraphNode, { type: "input" }>[],
): Extract<RuleGraphNode, { type: "input" }> | undefined {
  if (connectedInputNodes.length === 1) {
    return connectedInputNodes[0];
  }

  if (connectedInputNodes.length === 0) {
    return graph.nodes.find(
      (node): node is Extract<RuleGraphNode, { type: "input" }> =>
        node.type === "input",
    );
  }

  return undefined;
}

function updateInputSample(
  graph: RuleGraph,
  inputNodeId: string,
  sampleJson: string,
  onGraphChange: (graph: RuleGraph) => void,
): void {
  onGraphChange({
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === inputNodeId && node.type === "input"
        ? {
            ...node,
            content: {
              ...node.content,
              sampleJson,
            },
          }
        : node,
    ),
  });
}

function evaluateDebtSolution(input: Record<string, unknown>): {
  branches: { label: DebtSolutionRecommendation; passed: boolean }[];
  recommendation: DebtSolutionRecommendation;
} {
  const usefulGuide = engine.evaluateExpr(usefulGuideRule, input);
  const iva = engine.evaluateExpr(ivaRule, input);
  const dmp = engine.evaluateExpr(dmpRule, input);

  return {
    branches: [
      { label: "Useful Guide", passed: usefulGuide },
      { label: "IVA", passed: iva },
      { label: "DMP", passed: dmp },
    ],
    recommendation: usefulGuide ? "Useful Guide" : iva ? "IVA" : dmp ? "DMP" : "Useful Guide",
  };
}

function sampleInputMessage(connectedInputCount: number): string {
  if (connectedInputCount === 0) {
    return "Add an input node to evaluate.";
  }

  if (connectedInputCount > 1) {
    return "Result path has multiple connected input nodes. Connect exactly one input.";
  }

  return "Connected input node must contain a JSON object.";
}
