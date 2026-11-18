'use strict';

// Minimal semver range support: exact versions, x-ranges and partials
// ("0.44", "1.x"), comparators (<, <=, >, >=, =), ~, ^, hyphen ranges, "||".
// Prerelease versions never match.

const PART = String.raw`(x|X|\*|0|[1-9]\d*)`;
const PARTIAL = new RegExp(`^[v=]*${PART}(?:\\.${PART}(?:\\.${PART})?)?$`);
const FULL = /^[v=]*(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

function parse(version) {
  const m = FULL.exec(String(version).trim());
  if (!m) return null;
  return { v: [Number(m[1]), Number(m[2]), Number(m[3])], pre: Boolean(m[4]) };
}

// clean("v1.2.3") === "1.2.3"; null if not a full version
function clean(version) {
  const p = parse(version);
  return p ? p.v.join('.') : null;
}

function cmp(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

// "1.2" => [1, 2, null]; wildcards and missing parts are null
function parsePartial(s) {
  const m = PARTIAL.exec(s);
  if (!m) throw new Error(`invalid range: ${s}`);
  const out = [m[1], m[2], m[3]].map((x) => (x === undefined || /^[xX*]$/.test(x) ? null : Number(x)));
  for (let i = 1; i < 3; i++) {
    if (out[i - 1] === null) out[i] = null;
  }
  return out;
}

const fill = (p) => p.map((x) => x ?? 0);

// returns [lower, upper) bounds as {op, v} comparators
function expand(op, s) {
  const p = parsePartial(s);
  const [maj, min, pat] = p;
  const n = p.filter((x) => x !== null).length;
  if (n === 0) return op === '<' ? [{ op: '<', v: [0, 0, 0] }] : [];

  const bump = () => [[maj + 1, 0, 0], [maj, min + 1, 0], [maj, min, pat + 1]][n - 1];
  const range = () => [{ op: '>=', v: fill(p) }, { op: '<', v: bump() }];

  switch (op) {
    case '':
    case '=':
      return n === 3 ? [{ op: '=', v: fill(p) }] : range();
    case '>':
      return n === 3 ? [{ op: '>', v: fill(p) }] : [{ op: '>=', v: bump() }];
    case '>=':
      return [{ op: '>=', v: fill(p) }];
    case '<':
      return [{ op: '<', v: fill(p) }];
    case '<=':
      return n === 3 ? [{ op: '<=', v: fill(p) }] : [{ op: '<', v: bump() }];
    case '~':
      return [{ op: '>=', v: fill(p) }, { op: '<', v: n === 1 ? [maj + 1, 0, 0] : [maj, min + 1, 0] }];
    case '^': {
      let upper;
      if (maj > 0 || n === 1) upper = [maj + 1, 0, 0];
      else if (min > 0 || n === 2) upper = [0, min + 1, 0];
      else upper = [0, 0, pat + 1];
      return [{ op: '>=', v: fill(p) }, { op: '<', v: upper }];
    }
    default:
      throw new Error(`invalid operator: ${op}`);
  }
}

function parseSet(set) {
  let s = set.trim();
  const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(s);
  if (hyphen) {
    return [...expand('>=', hyphen[1]), ...expand('<=', hyphen[2])];
  }
  s = s.replace(/(<=|>=|<|>|=|\^|~)\s+/g, '$1');
  if (s === '') return [];
  return s.split(/\s+/).flatMap((tok) => {
    const m = /^(<=|>=|<|>|=|\^|~)?(.*)$/.exec(tok);
    return expand(m[1] || '', m[2]);
  });
}

function parseRange(range) {
  return String(range).split('||').map(parseSet);
}

function validRange(range) {
  try {
    parseRange(range);
    return true;
  } catch (e) {
    return false;
  }
}

function test(c, v) {
  const r = cmp(v, c.v);
  switch (c.op) {
    case '=': return r === 0;
    case '>': return r > 0;
    case '>=': return r >= 0;
    case '<': return r < 0;
    default: return r <= 0;
  }
}

function satisfies(version, range) {
  const p = parse(version);
  if (!p || p.pre) return false;
  return parseRange(range).some((set) => set.every((c) => test(c, p.v)));
}

// highest version in `versions` satisfying `range`, as given; null if none
function maxSatisfying(versions, range) {
  let best = null;
  let bestV = null;
  for (const version of versions) {
    if (satisfies(version, range)) {
      const { v } = parse(version);
      if (!bestV || cmp(v, bestV) > 0) {
        best = version;
        bestV = v;
      }
    }
  }
  return best;
}

module.exports = { clean, validRange, satisfies, maxSatisfying };
