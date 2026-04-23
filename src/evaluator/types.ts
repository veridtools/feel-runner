import type { EvaluationWarning, FeelContext } from '../types.js';

export interface EvalContext {
  vars: FeelContext;
  warnings: EvaluationWarning[];
}
