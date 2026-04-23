import type { AstNode } from '@veridtools/feel-parser';
import { type ParseSyntaxError, safeParse } from '@veridtools/feel-parser';
import { listBuiltinNames } from './builtins/registry.js';

export interface ValidationWarning {
  code: 'UNKNOWN_VARIABLE' | 'UNKNOWN_FUNCTION';
  message: string;
  name: string;
}

export interface ValidationError {
  message: string;
  start?: number;
  end?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

const BUILTIN_NAMES = new Set(listBuiltinNames());
// These identifiers are FEEL keywords / special names, never user variables
const FEEL_BUILTINS = new Set(['true', 'false', 'null', '?', 'item']);

function walkAst(
  node: AstNode,
  bound: Set<string>,
  schema: Set<string> | null,
  warnings: ValidationWarning[],
): void {
  switch (node.type) {
    case 'Identifier': {
      const name = node.name;
      if (FEEL_BUILTINS.has(name)) break;
      // Only warn about unknown variables when a schema is provided
      if (schema && !bound.has(name) && !schema.has(name)) {
        warnings.push({
          code: 'UNKNOWN_VARIABLE',
          message: `Variable '${name}' not found in schema`,
          name,
        });
      }
      break;
    }

    case 'FunctionCall': {
      // Check if the callee is a known builtin
      if (node.callee.type === 'Identifier') {
        const name = node.callee.name;
        if (!BUILTIN_NAMES.has(name) && !bound.has(name) && !schema?.has(name)) {
          warnings.push({
            code: 'UNKNOWN_FUNCTION',
            message: `Function '${name}' not found`,
            name,
          });
        }
      } else {
        walkAst(node.callee, bound, schema, warnings);
      }
      for (const arg of node.args) walkAst(arg.value, bound, schema, warnings);
      break;
    }

    case 'ForExpression': {
      const inner = new Set(bound);
      for (const b of node.bindings) {
        walkAst(b.domain, inner, schema, warnings);
        inner.add(b.name);
      }
      walkAst(node.body, inner, schema, warnings);
      break;
    }

    case 'QuantifiedExpression': {
      const inner = new Set(bound);
      for (const b of node.bindings) {
        walkAst(b.domain, inner, schema, warnings);
        inner.add(b.name);
      }
      walkAst(node.condition, inner, schema, warnings);
      break;
    }

    case 'FunctionDefinition': {
      const inner = new Set(bound);
      for (const p of node.params) inner.add(p.name);
      walkAst(node.body, inner, schema, warnings);
      break;
    }

    case 'ContextLiteral': {
      const inner = new Set(bound);
      for (const entry of node.entries) {
        if (typeof entry.key === 'string') inner.add(entry.key);
        else walkAst(entry.key, inner, schema, warnings);
        walkAst(entry.value, inner, schema, warnings);
      }
      break;
    }

    case 'BinaryOp':
      walkAst(node.left, bound, schema, warnings);
      walkAst(node.right, bound, schema, warnings);
      break;

    case 'UnaryMinus':
      walkAst(node.operand, bound, schema, warnings);
      break;

    case 'IfExpression':
      walkAst(node.condition, bound, schema, warnings);
      walkAst(node.consequent, bound, schema, warnings);
      walkAst(node.alternate, bound, schema, warnings);
      break;

    case 'PathExpression':
      walkAst(node.object, bound, schema, warnings);
      break;

    case 'FilterExpression':
      walkAst(node.list, bound, schema, warnings);
      walkAst(node.filter, new Set([...bound, 'item']), schema, warnings);
      break;

    case 'RangeLiteral':
      if (node.start) walkAst(node.start, bound, schema, warnings);
      if (node.end) walkAst(node.end, bound, schema, warnings);
      break;

    case 'ListLiteral':
      for (const el of node.elements) walkAst(el, bound, schema, warnings);
      break;

    case 'UnaryTestList':
      for (const t of node.tests) walkAst(t, bound, schema, warnings);
      break;

    case 'InstanceOf':
      walkAst(node.value, bound, schema, warnings);
      break;

    case 'InExpression':
      walkAst(node.value, bound, schema, warnings);
      walkAst(node.test, bound, schema, warnings);
      break;

    case 'BetweenExpression':
      walkAst(node.value, bound, schema, warnings);
      walkAst(node.low, bound, schema, warnings);
      walkAst(node.high, bound, schema, warnings);
      break;

    case 'LetExpression': {
      walkAst(node.value, bound, schema, warnings);
      walkAst(node.body, new Set([...bound, node.name]), schema, warnings);
      break;
    }

    case 'PipelineExpression':
      walkAst(node.left, bound, schema, warnings);
      walkAst(node.right, new Set([...bound, '?']), schema, warnings);
      break;

    case 'ErrorNode':
      break;

    // Leaves — nothing to walk
    case 'NumberLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'TemporalLiteral':
      break;
  }
}

export function validate(expression: string, schema?: Record<string, string>): ValidationResult {
  const knownNames = schema ? new Set(Object.keys(schema)) : new Set<string>();

  let ast: AstNode;
  let parseErrors: ParseSyntaxError[];
  try {
    ({ ast, errors: parseErrors } = safeParse(expression, 'expression', knownNames));
  } catch (e) {
    return {
      valid: false,
      errors: [{ message: e instanceof Error ? e.message : String(e) }],
      warnings: [],
    };
  }

  if (parseErrors.length > 0) {
    return {
      valid: false,
      errors: parseErrors.map((e) => ({ message: e.message, start: e.start, end: e.end })),
      warnings: [],
    };
  }

  const warnings: ValidationWarning[] = [];
  const schemaKeys = schema ? new Set(Object.keys(schema)) : null;
  walkAst(ast, new Set<string>(), schemaKeys, warnings);

  return { valid: true, errors: [], warnings };
}
