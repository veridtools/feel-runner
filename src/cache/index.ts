import type { AstNode } from '@veridtools/feel-parser';
import { parse } from '@veridtools/feel-parser';
import { evalExpression } from '../evaluator/index.js';
import type { EvaluationResult, FeelContext, FeelDialect } from '../types.js';

export interface CompiledExpression {
  readonly ast: AstNode;
  readonly dialect: FeelDialect;
  evaluate(context?: FeelContext): EvaluationResult;
}

class ParseCache {
  private readonly cache = new Map<string, AstNode>();

  get(key: string): AstNode | undefined {
    return this.cache.get(key);
  }

  set(key: string, ast: AstNode): void {
    this.cache.set(key, ast);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

const defaultCache = new ParseCache();

export function compile(
  expression: string,
  dialect: FeelDialect = 'expression',
  cache: ParseCache = defaultCache,
): CompiledExpression {
  const cacheKey = `${dialect}:${expression}`;
  let ast = cache.get(cacheKey);
  if (!ast) {
    ast = parse(expression, dialect);
    cache.set(cacheKey, ast);
  }
  const capturedAst = ast;
  return {
    ast: capturedAst,
    dialect,
    evaluate(context: FeelContext = {}) {
      return evalExpression(capturedAst, context);
    },
  };
}

export function createCache(): ParseCache {
  return new ParseCache();
}

export { defaultCache };
