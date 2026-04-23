import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('builtins/range', () => {
  describe('before()', () => {
    it('point before range (inclusive start)', () => {
      expect(evaluate('before(1, [2..5])').value).toBe(true);
      expect(evaluate('before(2, [2..5])').value).toBe(false);
      expect(evaluate('before(3, [2..5])').value).toBe(false);
    });

    it('point before range (exclusive start)', () => {
      expect(evaluate('before(2, (2..5])').value).toBe(true);
    });

    it('point before point', () => {
      expect(evaluate('before(1, 3)').value).toBe(true);
      expect(evaluate('before(3, 1)').value).toBe(false);
    });

    it('range before range', () => {
      expect(evaluate('before([1..3], [5..7])').value).toBe(true);
      expect(evaluate('before([1..5], [3..7])').value).toBe(false);
    });

    it('range before range with exclusive end', () => {
      expect(evaluate('before([1..3), [3..5])').value).toBe(true);
    });
  });

  describe('after()', () => {
    it('point after range', () => {
      expect(evaluate('after(6, [2..5])').value).toBe(true);
      expect(evaluate('after(5, [2..5])').value).toBe(false);
      expect(evaluate('after(3, [2..5])').value).toBe(false);
    });
  });

  describe('meets()', () => {
    it('inclusive end meets inclusive start', () => {
      expect(evaluate('meets([1..3], [3..5])').value).toBe(true);
    });

    it('exclusive end does not meet inclusive start', () => {
      expect(evaluate('meets([1..3), [3..5])').value).toBe(false);
    });

    it('non-adjacent ranges do not meet', () => {
      expect(evaluate('meets([1..3], [4..5])').value).toBe(false);
    });
  });

  describe('met by()', () => {
    it('range met by another range', () => {
      expect(evaluate('met by([3..5], [1..3])').value).toBe(true);
      expect(evaluate('met by([3..5], [1..2])').value).toBe(false);
    });
  });

  describe('overlaps()', () => {
    it('overlapping ranges', () => {
      expect(evaluate('overlaps([1..4], [3..6])').value).toBe(true);
    });

    it('non-overlapping ranges', () => {
      expect(evaluate('overlaps([1..2], [5..6])').value).toBe(false);
    });

    it('adjacent ranges do not overlap', () => {
      expect(evaluate('overlaps([1..3), [3..5])').value).toBe(false);
      expect(evaluate('overlaps([1..3], [3..5])').value).toBe(true);
    });
  });

  describe('includes()', () => {
    it('range includes point', () => {
      expect(evaluate('includes([1..5], 3)').value).toBe(true);
      expect(evaluate('includes([1..5], 1)').value).toBe(true);
      expect(evaluate('includes([1..5], 5)').value).toBe(true);
      expect(evaluate('includes([1..5], 6)').value).toBe(false);
    });

    it('range includes range', () => {
      expect(evaluate('includes([1..5], [2..4])').value).toBe(true);
      expect(evaluate('includes([1..5], [1..5])').value).toBe(true);
      expect(evaluate('includes([1..5], [0..5])').value).toBe(false);
    });
  });

  describe('during()', () => {
    it('point during range', () => {
      expect(evaluate('during(3, [1..5])').value).toBe(true);
      expect(evaluate('during(6, [1..5])').value).toBe(false);
    });

    it('range during range', () => {
      expect(evaluate('during([2..4], [1..5])').value).toBe(true);
      expect(evaluate('during([1..6], [1..5])').value).toBe(false);
    });
  });

  describe('starts() and started by()', () => {
    it('starts', () => {
      expect(evaluate('starts(1, [1..5])').value).toBe(true);
      expect(evaluate('starts(2, [1..5])').value).toBe(false);
    });

    it('started by', () => {
      expect(evaluate('started by([1..5], 1)').value).toBe(true);
      expect(evaluate('started by([1..5], 2)').value).toBe(false);
    });

    it('range starts range', () => {
      expect(evaluate('starts([1..3], [1..5])').value).toBe(true);
      expect(evaluate('starts([2..3], [1..5])').value).toBe(false);
    });
  });

  describe('finishes() and finished by()', () => {
    it('finishes', () => {
      expect(evaluate('finishes(5, [1..5])').value).toBe(true);
      expect(evaluate('finishes(4, [1..5])').value).toBe(false);
    });

    it('finished by', () => {
      expect(evaluate('finished by([1..5], 5)').value).toBe(true);
      expect(evaluate('finished by([1..5], 4)').value).toBe(false);
    });
  });

  describe('overlaps before() and overlaps after()', () => {
    it('overlaps before', () => {
      expect(evaluate('overlaps before([1..5], [3..7])').value).toBe(true);
      expect(evaluate('overlaps before([1..3], [4..6])').value).toBe(false);
    });

    it('overlaps after', () => {
      expect(evaluate('overlaps after([3..7], [1..5])').value).toBe(true);
    });
  });

  describe('finishes() with range argument', () => {
    it('range finishes range (same end)', () => {
      expect(evaluate('finishes([3..5], [1..5])').value).toBe(true);
    });

    it('different end → false', () => {
      expect(evaluate('finishes([3..5), [1..5])').value).toBe(false);
    });
  });

  describe('starts() with range argument', () => {
    it('range starts range (same start)', () => {
      expect(evaluate('starts([1..3], [1..5])').value).toBe(true);
    });

    it('different start → false', () => {
      expect(evaluate('starts([2..3], [1..5])').value).toBe(false);
    });
  });

  describe('coincides()', () => {
    it('equal ranges', () => {
      expect(evaluate('coincides([1..5], [1..5])').value).toBe(true);
    });

    it('different ranges', () => {
      expect(evaluate('coincides([1..5], [1..6])').value).toBe(false);
    });

    it('ranges with different end inclusion', () => {
      expect(evaluate('coincides([1..5], [1..5))').value).toBe(false);
    });

    it('same points', () => {
      expect(evaluate('coincides(3, 3)').value).toBe(true);
      expect(evaluate('coincides(3, 4)').value).toBe(false);
    });
  });

  describe('range literal membership', () => {
    it('in range (inclusive)', () => {
      expect(evaluate('x in [1..5]', { x: 3 }).value).toBe(true);
      expect(evaluate('x in [1..5]', { x: 1 }).value).toBe(true);
      expect(evaluate('x in [1..5]', { x: 5 }).value).toBe(true);
      expect(evaluate('x in [1..5]', { x: 6 }).value).toBe(false);
    });

    it('in range (exclusive)', () => {
      expect(evaluate('x in (1..5)', { x: 2 }).value).toBe(true);
      expect(evaluate('x in (1..5)', { x: 1 }).value).toBe(false);
      expect(evaluate('x in (1..5)', { x: 5 }).value).toBe(false);
    });

    it('range with dates', () => {
      expect(evaluate('date("2024-06-01") in [date("2024-01-01")..date("2024-12-31")]').value).toBe(
        true,
      );
    });
  });

  describe('range edge cases', () => {
    it('descending range start > end — before() still works on valid input', () => {
      expect(evaluate('before(1, [2..5])').value).toBe(true);
    });

    it('point equals start of exclusive range — not before', () => {
      expect(evaluate('before(2, (2..5])').value).toBe(true);
    });

    it('point equals end of inclusive range — not after', () => {
      expect(evaluate('after(5, [2..5])').value).toBe(false);
    });

    it('during with exclusive boundaries', () => {
      expect(evaluate('during(1, (1..5))').value).toBe(false);
      expect(evaluate('during(5, (1..5))').value).toBe(false);
      expect(evaluate('during(3, (1..5))').value).toBe(true);
    });

    it('coincides with different inclusion on one end returns false', () => {
      expect(evaluate('coincides([1..5], [1..5))').value).toBe(false);
      expect(evaluate('coincides([1..5], (1..5])').value).toBe(false);
    });

    it('meets with exclusive end/start does not meet', () => {
      expect(evaluate('meets([1..3), [3..5])').value).toBe(false);
    });

    it('overlaps before with touching exclusive boundary', () => {
      expect(evaluate('overlaps before([1..3), [3..5])').value).toBe(false);
    });

    it('range with duration endpoints', () => {
      expect(evaluate('duration("P2D") in [duration("P1D")..duration("P3D")]').value).toBe(true);
      expect(evaluate('duration("P5D") in [duration("P1D")..duration("P3D")]').value).toBe(false);
    });
  });

  describe('null handling in ranges', () => {
    it('includes() with value outside null-endpoint range', () => {
      expect(evaluate('includes([1..5], 3)').value).toBe(true);
    });

    it('null point returns null for comparisons', () => {
      expect(evaluate('before(null, [1..5])').value).toBeNull();
      expect(evaluate('after(null, [1..5])').value).toBeNull();
    });
  });
});
