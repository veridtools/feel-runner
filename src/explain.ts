import type { AstNode } from '@veridtools/feel-parser';
import { parse } from '@veridtools/feel-parser';
import { isDecimal } from './decimal.js';
import { evalExpression } from './evaluator/index.js';
import type { FeelContext, FeelValue } from './types.js';

export interface ExplainResult {
  result: FeelValue;
  explanation: string;
}

function fmtVal(v: FeelValue): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'boolean') return String(v);
  if (isDecimal(v)) return v.toNumber().toString();
  if (typeof v === 'number') return v.toString();
  if (Array.isArray(v)) return `[${(v as FeelValue[]).map(fmtVal).join(', ')}]`;
  if (typeof v === 'object' && 'kind' in v) {
    const o = v as Record<string, unknown>;
    if (o.kind === 'date')
      return `date("${o.year}-${String(o.month).padStart(2, '0')}-${String(o.day).padStart(2, '0')}")`;
    if (o.kind === 'time')
      return `time("${String(o.hour).padStart(2, '0')}:${String(o.minute).padStart(2, '0')}:${String(o.second).padStart(2, '0')}")`;
    if (o.kind === 'date-time') return `date and time(...)`;
    if (o.kind === 'days-time-duration' || o.kind === 'years-months-duration')
      return `duration(...)`;
    if (o.kind === 'function') return '<function>';
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function evalWith(node: AstNode, vars: FeelContext): FeelValue {
  try {
    return evalExpression(node, vars).value;
  } catch {
    return null;
  }
}

function explainNode(node: AstNode, vars: FeelContext, indent: number): string {
  const pad = '  '.repeat(indent);
  switch (node.type) {
    case 'IfExpression': {
      const condVal = evalWith(node.condition, vars);
      const condText = explainNode(node.condition, vars, indent + 1);
      const branch = condVal === true ? 'then' : 'else';
      const branchNode = condVal === true ? node.consequent : node.alternate;
      const branchVal = evalWith(branchNode, vars);
      const condLine = `${pad}condition: ${condText.trimStart()} → ${fmtVal(condVal)}`;
      const branchLine = `${pad}→ ${branch} branch: ${fmtVal(branchVal)}`;
      return `${condLine}\n${branchLine}`;
    }

    case 'BinaryOp': {
      const leftVal = evalWith(node.left, vars);
      const rightVal = evalWith(node.right, vars);
      const result = evalWith(node, vars);
      const leftStr =
        node.left.type === 'Identifier'
          ? `${node.left.name} (${fmtVal(leftVal)})`
          : fmtVal(leftVal);
      const rightStr =
        node.right.type === 'Identifier'
          ? `${node.right.name} (${fmtVal(rightVal)})`
          : fmtVal(rightVal);
      if (node.op === 'and' || node.op === 'or') {
        const leftExpl = explainNode(node.left, vars, indent);
        const rightExpl = explainNode(node.right, vars, indent);
        return `${leftExpl}\n${pad}${node.op.toUpperCase()}\n${rightExpl}\n${pad}→ ${fmtVal(result)}`;
      }
      return `${pad}${leftStr} ${node.op} ${rightStr} → ${fmtVal(result)}`;
    }

    case 'LetExpression': {
      const val = evalWith(node.value, vars);
      const innerVars = { ...vars, [node.name]: val };
      const bodyExpl = explainNode(node.body, innerVars, indent + 1);
      return `${pad}let ${node.name} = ${fmtVal(val)}\n${bodyExpl}`;
    }

    case 'PipelineExpression': {
      const leftVal = evalWith(node.left, vars);
      const result = evalWith(node, vars);
      return `${pad}${fmtVal(leftVal)} |> ... → ${fmtVal(result)}`;
    }

    case 'Identifier': {
      const val = vars[node.name] ?? null;
      if (node.name === '?') return `${pad}? (${fmtVal(val)})`;
      return `${pad}${node.name} (${fmtVal(val)})`;
    }

    case 'ErrorNode':
      return `${pad}<parse error: ${node.message}>`;

    default: {
      const val = evalWith(node, vars);
      return `${pad}${fmtVal(val)}`;
    }
  }
}

export function explain(expression: string, context: FeelContext = {}): ExplainResult {
  const knownNames = new Set(Object.keys(context));
  const ast = parse(expression, 'expression', knownNames);
  const { value: result } = evalExpression(ast, context);

  const top = explainNode(ast, context, 0);
  const explanation = `Result: ${fmtVal(result)}\n${top}`;

  return { result, explanation };
}
