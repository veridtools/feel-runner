import { describe, expect, it } from 'vitest';
import { evaluate } from '../index.js';

describe('strings', () => {
  it('string literal', () => {
    expect(evaluate('"hello"').value).toBe('hello');
  });

  it('string concatenation', () => {
    expect(evaluate('"hello" + " " + "world"').value).toBe('hello world');
  });

  it('string equality', () => {
    expect(evaluate('"foo" = "foo"').value).toBe(true);
    expect(evaluate('"foo" = "bar"').value).toBe(false);
  });

  it('string comparison', () => {
    expect(evaluate('"a" < "b"').value).toBe(true);
  });

  it('contains function', () => {
    expect(evaluate('contains("foobar", "oba")').value).toBe(true);
    expect(evaluate('contains("foobar", "xyz")').value).toBe(false);
  });

  it('string length', () => {
    expect(evaluate('string length("hello")').value).toBe(5);
  });

  it('upper and lower case', () => {
    expect(evaluate('upper case("hello")').value).toBe('HELLO');
    expect(evaluate('lower case("HELLO")').value).toBe('hello');
  });

  it('substring', () => {
    expect(evaluate('substring("hello", 2, 3)').value).toBe('ell');
  });

  it('starts with', () => {
    expect(evaluate('starts with("foobar", "foo")').value).toBe(true);
  });

  it('ends with', () => {
    expect(evaluate('ends with("foobar", "bar")').value).toBe(true);
  });

  it('matches regex', () => {
    expect(evaluate('matches("foo123", "[a-z]+[0-9]+")').value).toBe(true);
  });

  it('replace', () => {
    expect(evaluate('replace("hello world", "world", "FEEL")').value).toBe('hello FEEL');
  });

  it('split', () => {
    expect(evaluate('split("a,b,c", ",")').value).toEqual(['a', 'b', 'c']);
  });

  it('Unicode string length counts code points', () => {
    expect(evaluate('string length("café")').value).toBe(4);
    expect(evaluate('string length("🎉")').value).toBe(1);
    expect(evaluate('string length("日本語")').value).toBe(3);
  });

  it('substring negative index (from end)', () => {
    expect(evaluate('substring("hello", -2)').value).toBe('lo');
    expect(evaluate('substring("abcdef", -3, 2)').value).toBe('de');
  });

  it('null in string concat returns null', () => {
    expect(evaluate('"a" + null').value).toBeNull();
    expect(evaluate('null + "a"').value).toBeNull();
  });
});

describe('builtins/string', () => {
  describe('string length()', () => {
    it('ASCII strings', () => {
      expect(evaluate('string length("hello")').value).toBe(5);
      expect(evaluate('string length("")').value).toBe(0);
      expect(evaluate('string length("a")').value).toBe(1);
    });

    it('counts Unicode code points', () => {
      expect(evaluate('string length("😀")').value).toBe(1);
      expect(evaluate('string length("café")').value).toBe(4);
    });

    it('null returns null', () => {
      expect(evaluate('string length(null)').value).toBeNull();
    });
  });

  describe('substring()', () => {
    it('positive start (1-based)', () => {
      expect(evaluate('substring("hello", 1)').value).toBe('hello');
      expect(evaluate('substring("hello", 2)').value).toBe('ello');
      expect(evaluate('substring("hello", 5)').value).toBe('o');
    });

    it('negative start (from end)', () => {
      expect(evaluate('substring("hello", -2)').value).toBe('lo');
      expect(evaluate('substring("hello", -3)').value).toBe('llo');
    });

    it('with length', () => {
      expect(evaluate('substring("hello", 1, 3)').value).toBe('hel');
      expect(evaluate('substring("hello", 2, 3)').value).toBe('ell');
      expect(evaluate('substring("hello", 3, 10)').value).toBe('llo');
    });

    it('null returns null', () => {
      expect(evaluate('substring(null, 1)').value).toBeNull();
      expect(evaluate('substring("hello", null)').value).toBeNull();
    });
  });

  describe('upper case() and lower case()', () => {
    it('upper case', () => {
      expect(evaluate('upper case("hello")').value).toBe('HELLO');
      expect(evaluate('upper case("Hello World")').value).toBe('HELLO WORLD');
      expect(evaluate('upper case("")').value).toBe('');
    });

    it('lower case', () => {
      expect(evaluate('lower case("HELLO")').value).toBe('hello');
      expect(evaluate('lower case("Hello World")').value).toBe('hello world');
    });

    it('null returns null', () => {
      expect(evaluate('upper case(null)').value).toBeNull();
      expect(evaluate('lower case(null)').value).toBeNull();
    });
  });

  describe('substring before() and after()', () => {
    it('substring before', () => {
      expect(evaluate('substring before("hello", "l")').value).toBe('he');
      expect(evaluate('substring before("foobar", "bar")').value).toBe('foo');
      expect(evaluate('substring before("foobar", "xyz")').value).toBe('');
      expect(evaluate('substring before("foobar", "foo")').value).toBe('');
    });

    it('substring after', () => {
      expect(evaluate('substring after("hello", "l")').value).toBe('lo');
      expect(evaluate('substring after("foobar", "foo")').value).toBe('bar');
      expect(evaluate('substring after("foobar", "xyz")').value).toBe('');
    });

    it('null returns null', () => {
      expect(evaluate('substring before(null, "bar")').value).toBeNull();
      expect(evaluate('substring after("foo", null)').value).toBeNull();
    });
  });

  describe('contains()', () => {
    it('found', () => {
      expect(evaluate('contains("hello", "ell")').value).toBe(true);
      expect(evaluate('contains("foobar", "bar")').value).toBe(true);
      expect(evaluate('contains("foobar", "")').value).toBe(true);
    });

    it('not found', () => {
      expect(evaluate('contains("hello", "xyz")').value).toBe(false);
      expect(evaluate('contains("foobar", "FOO")').value).toBe(false);
    });

    it('null returns null', () => {
      expect(evaluate('contains(null, "foo")').value).toBeNull();
      expect(evaluate('contains("foo", null)').value).toBeNull();
    });
  });

  describe('starts with() and ends with()', () => {
    it('starts with', () => {
      expect(evaluate('starts with("hello", "he")').value).toBe(true);
      expect(evaluate('starts with("hello", "lo")').value).toBe(false);
      expect(evaluate('starts with("foobar", "")').value).toBe(true);
    });

    it('ends with', () => {
      expect(evaluate('ends with("hello", "lo")').value).toBe(true);
      expect(evaluate('ends with("hello", "he")').value).toBe(false);
      expect(evaluate('ends with("foobar", "")').value).toBe(true);
    });

    it('null returns null', () => {
      expect(evaluate('starts with(null, "foo")').value).toBeNull();
      expect(evaluate('ends with("foo", null)').value).toBeNull();
    });
  });

  describe('matches()', () => {
    it('basic pattern matching', () => {
      expect(evaluate('matches("foo123", "[a-z]+\\d+")').value).toBe(true);
      expect(evaluate('matches("foo", "\\d+")').value).toBe(false);
      expect(evaluate('matches("hello", "h.*o")').value).toBe(true);
      expect(evaluate('matches("hello", "^hello$")').value).toBe(true);
    });

    it('with i flag (case-insensitive)', () => {
      expect(evaluate('matches("HELLO", "hello", "i")').value).toBe(true);
    });

    it('with x flag (removes pattern whitespace)', () => {
      // x flag: whitespace in the pattern is ignored
      // "a b" as pattern with x becomes "ab"; string "ab" matches
      expect(evaluate('matches("ab", "a b", "x")').value).toBe(true);
      // but "a b" (with space) does NOT match stripped pattern "ab"
      expect(evaluate('matches("a b", "a b", "x")').value).toBe(false);
    });

    it('with s flag (dot matches newline)', () => {
      expect(evaluate('matches("hello\\nworld", "hello.world", "s")').value).toBe(true);
    });

    it('null returns null', () => {
      expect(evaluate('matches(null, ".")').value).toBeNull();
      expect(evaluate('matches("hello", null)').value).toBeNull();
    });
  });

  describe('replace()', () => {
    it('replaces all occurrences', () => {
      expect(evaluate('replace("hello world", "o", "0")').value).toBe('hell0 w0rld');
      expect(evaluate('replace("aaa", "a", "b")').value).toBe('bbb');
    });

    it('with capture group', () => {
      expect(evaluate('replace("abc", "(a)", "$1$1")').value).toBe('aabc');
    });

    it('with flags', () => {
      expect(evaluate('replace("Hello World", "hello", "Hi", "i")').value).toBe('Hi World');
    });

    it('null returns null', () => {
      expect(evaluate('replace(null, "a", "b")').value).toBeNull();
    });
  });

  describe('split()', () => {
    it('splits by delimiter', () => {
      expect(evaluate('split("a,b,c", ",")').value).toEqual(['a', 'b', 'c']);
    });

    it('splits by regex', () => {
      expect(evaluate('split("a1b2c", "\\d")').value).toEqual(['a', 'b', 'c']);
    });

    it('preserves empty strings between adjacent delimiters', () => {
      expect(evaluate('split("a,,b", ",")').value).toEqual(['a', '', 'b']);
    });

    it('empty delimiter splits into individual characters', () => {
      expect(evaluate('split("abc", "")').value).toEqual(['a', 'b', 'c']);
    });

    it('null returns null', () => {
      expect(evaluate('split(null, ",")').value).toBeNull();
    });
  });

  describe('trim()', () => {
    it('trims whitespace', () => {
      expect(evaluate('trim("  hello  ")').value).toBe('hello');
      expect(evaluate('trim("hello")').value).toBe('hello');
      expect(evaluate('trim("  ")').value).toBe('');
    });

    it('null returns null', () => {
      expect(evaluate('trim(null)').value).toBeNull();
    });
  });

  describe('extract()', () => {
    it('returns list of match arrays', () => {
      const result = evaluate('extract("foo bar", "[a-z]+")').value as unknown[][];
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(['foo']);
      expect(result[1]).toEqual(['bar']);
    });

    it('includes capture groups', () => {
      const result = evaluate('extract("2024-01-15", "(\\d{4})-(\\d{2})-(\\d{2})")')
        .value as unknown[][];
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(['2024-01-15', '2024', '01', '15']);
    });

    it('no matches returns empty list', () => {
      expect(evaluate('extract("hello", "\\d+")').value).toEqual([]);
    });

    it('overlapping is prevented (advances past zero-width)', () => {
      const result = evaluate('extract("aaa", "a*")').value as unknown[][];
      expect(Array.isArray(result)).toBe(true);
    });

    it('null returns null', () => {
      expect(evaluate('extract(null, "[a-z]+")').value).toBeNull();
      expect(evaluate('extract("foo", null)').value).toBeNull();
    });

    it('invalid pattern returns null', () => {
      expect(evaluate('extract("foo", "[invalid")').value).toBeNull();
    });
  });

  describe('pad left()', () => {
    it('pads to target length with spaces', () => {
      expect(evaluate('pad left("abc", 6)').value).toBe('   abc');
      expect(evaluate('pad left("", 3)').value).toBe('   ');
    });

    it('pads with custom character', () => {
      expect(evaluate('pad left("abc", 6, "0")').value).toBe('000abc');
      expect(evaluate('pad left("5", 4, "0")').value).toBe('0005');
    });

    it('string already at or above length returns unchanged', () => {
      expect(evaluate('pad left("hello", 5)').value).toBe('hello');
      expect(evaluate('pad left("hello", 3)').value).toBe('hello');
    });

    it('uses first code point of multi-char pad string', () => {
      expect(evaluate('pad left("abc", 5, "xy")').value).toBe('xxabc');
    });

    it('null/invalid returns null', () => {
      expect(evaluate('pad left(null, 5)').value).toBeNull();
      expect(evaluate('pad left("abc", null)').value).toBeNull();
      expect(evaluate('pad left("abc", 5, 42)').value).toBeNull();
    });
  });

  describe('pad right()', () => {
    it('pads to target length with spaces', () => {
      expect(evaluate('pad right("abc", 6)').value).toBe('abc   ');
      expect(evaluate('pad right("", 3)').value).toBe('   ');
    });

    it('pads with custom character', () => {
      expect(evaluate('pad right("abc", 6, "-")').value).toBe('abc---');
    });

    it('string already at or above length returns unchanged', () => {
      expect(evaluate('pad right("hello", 5)').value).toBe('hello');
      expect(evaluate('pad right("hello", 3)').value).toBe('hello');
    });

    it('null/invalid returns null', () => {
      expect(evaluate('pad right(null, 5)').value).toBeNull();
      expect(evaluate('pad right("abc", null)').value).toBeNull();
    });
  });

  describe('encode for URI()', () => {
    it('encodes special characters', () => {
      expect(evaluate('encode for URI("hello world")').value).toBe('hello%20world');
      expect(evaluate('encode for URI("a=b&c=d")').value).toBe('a%3Db%26c%3Dd');
    });

    it('plain alphanumeric is unchanged', () => {
      expect(evaluate('encode for URI("abc123")').value).toBe('abc123');
    });

    it('empty string', () => {
      expect(evaluate('encode for URI("")').value).toBe('');
    });

    it('null returns null', () => {
      expect(evaluate('encode for URI(null)').value).toBeNull();
    });
  });

  describe('decode for URI()', () => {
    it('decodes percent-encoded characters', () => {
      expect(evaluate('decode for URI("hello%20world")').value).toBe('hello world');
      expect(evaluate('decode for URI("a%3Db%26c%3Dd")').value).toBe('a=b&c=d');
    });

    it('plain string passes through', () => {
      expect(evaluate('decode for URI("abc123")').value).toBe('abc123');
    });

    it('null returns null', () => {
      expect(evaluate('decode for URI(null)').value).toBeNull();
    });

    it('invalid percent encoding returns null', () => {
      expect(evaluate('decode for URI("%zz")').value).toBeNull();
    });
  });

  describe('string join()', () => {
    it('joins with delimiter', () => {
      expect(evaluate('string join(["a", "b", "c"], "-")').value).toBe('a-b-c');
    });

    it('with prefix and suffix', () => {
      expect(evaluate('string join(["a", "b", "c"], "-", "[", "]")').value).toBe('[a-b-c]');
    });

    it('null items are omitted', () => {
      expect(evaluate('string join(["a", null, "c"], ",")').value).toBe('a,c');
    });

    it('empty delimiter', () => {
      expect(evaluate('string join(["a", "b", "c"])').value).toBe('abc');
    });

    it('only null items → empty string', () => {
      expect(evaluate('string join([null, null], ",")').value).toBe('');
    });

    it('single string (not list) is treated as single-element list', () => {
      expect(evaluate('string join("hello", "-")').value).toBe('hello');
    });

    it('prefix without suffix returns null', () => {
      expect(evaluate('string join(["a","b"], ",", "[")').value).toBeNull();
    });

    it('non-string delimiter returns null', () => {
      expect(evaluate('string join(["a","b"], 5)').value).toBeNull();
    });
  });

  describe('substring() edge cases', () => {
    it('length 0 returns empty string', () => {
      expect(evaluate('substring("hello", 1, 0)').value).toBe('');
    });

    it('start position > length returns empty string', () => {
      expect(evaluate('substring("hello", 10)').value).toBe('');
    });

    it('length exceeds string returns rest of string', () => {
      expect(evaluate('substring("hello", 2, 100)').value).toBe('ello');
    });

    it('Unicode code point counting', () => {
      // café is 4 code points; substring(2) = afé
      expect(evaluate('substring("café", 2)').value).toBe('afé');
    });
  });

  describe('replace() edge cases', () => {
    it('no match returns original string', () => {
      expect(evaluate('replace("hello", "xyz", "Z")').value).toBe('hello');
    });

    it('empty pattern raises ERRFORX0003 per XPath spec', () => {
      // XPath fn:replace raises error if pattern can match empty string → null in FEEL
      expect(evaluate('replace("abc", "", "-")').value).toBeNull();
      expect(evaluate('replace("abc", "b*", "X")').value).toBeNull();
    });

    it('case-insensitive replace', () => {
      expect(evaluate('replace("Hello World", "[a-z]+", "X", "i")').value).toBe('X X');
    });

    it('null args return null', () => {
      expect(evaluate('replace(null, "a", "b")').value).toBeNull();
      expect(evaluate('replace("a", null, "b")').value).toBeNull();
      expect(evaluate('replace("a", "a", null)').value).toBeNull();
    });
  });

  describe('matches() edge cases', () => {
    it('anchored pattern', () => {
      expect(evaluate('matches("abc", "^abc$")').value).toBe(true);
      expect(evaluate('matches("xabc", "^abc$")').value).toBe(false);
    });

    it('dot does not match newline by default', () => {
      expect(evaluate('matches("a\\nb", "a.b")').value).toBe(false);
    });

    it('m flag (multiline) affects ^ and $', () => {
      expect(evaluate('matches("first\\nsecond", "^second", "m")').value).toBe(true);
    });

    it('invalid regex pattern returns null or false', () => {
      const r = evaluate('matches("foo", "[invalid")').value;
      expect(r === null || r === false).toBe(true);
    });
  });

  describe('pad left/right edge cases', () => {
    it('negative length treated as 0 (no padding)', () => {
      expect(evaluate('pad left("abc", -1)').value).toBe('abc');
    });

    it('float length is floored', () => {
      expect(evaluate('pad left("abc", 5.9)').value).toBe('  abc');
    });

    it('empty pad character uses space', () => {
      expect(evaluate('pad left("x", 3, "")').value).toBe('  x');
    });
  });

  describe('encode/decode for URI edge cases', () => {
    it('encodes unicode characters', () => {
      const encoded = evaluate('encode for URI("café")').value as string;
      expect(encoded).toContain('%');
    });

    it('round-trip encode then decode', () => {
      const expr = 'decode for URI(encode for URI("hello world & more"))';
      expect(evaluate(expr).value).toBe('hello world & more');
    });

    it('decode already-plain string is unchanged', () => {
      expect(evaluate('decode for URI("abc123")').value).toBe('abc123');
    });
  });
});
