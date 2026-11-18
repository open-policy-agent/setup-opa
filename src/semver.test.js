'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { clean, validRange, satisfies, maxSatisfying } = require('./semver');

test('clean', () => {
  assert.equal(clean('v0.37.2'), '0.37.2');
  assert.equal(clean(' 1.2.3 '), '1.2.3');
  assert.equal(clean('0.44'), null);
  assert.equal(clean('<0.38'), null);
  assert.equal(clean('latest'), null);
});

test('satisfies', () => {
  const cases = [
    ['0.37.1', '0.37.1', true],
    ['0.37.2', '0.37.1', false],
    ['0.37.2', '<0.38', true],
    ['0.38.0', '<0.38', false],
    ['0.44.3', '0.44', true],
    ['0.45.0', '0.44', false],
    ['0.44.3', '0.44.x', true],
    ['1.5.0', '1', true],
    ['2.0.0', '1.x', false],
    ['1.5.0', '*', true],
    ['1.5.0', '', true],
    ['1.2.3', '>=1.2.3', true],
    ['1.2.2', '>=1.2.3', false],
    ['1.2.3', '> 1.2.3', false],
    ['1.2.4', '>1.2.3', true],
    ['1.3.0', '>1.2', true],
    ['1.2.9', '>1.2', false],
    ['1.2.9', '<=1.2', true],
    ['1.3.0', '<=1.2', false],
    ['1.2.5', '~1.2.3', true],
    ['1.3.0', '~1.2.3', false],
    ['1.9.0', '~1', true],
    ['1.9.0', '^1.2.3', true],
    ['2.0.0', '^1.2.3', false],
    ['0.2.9', '^0.2.3', true],
    ['0.3.0', '^0.2.3', false],
    ['0.0.3', '^0.0.3', true],
    ['0.0.4', '^0.0.3', false],
    ['0.0.9', '^0.0', true],
    ['0.1.0', '^0.0', false],
    ['0.9.0', '^0', true],
    ['1.0.0', '^0', false],
    ['1.2.3', '1.2.3 - 2.3.4', true],
    ['2.3.9', '1.2.3 - 2.3', true],
    ['2.4.0', '1.2.3 - 2.3', false],
    ['1.5.0', '>=1.2.0 <1.6.0', true],
    ['1.6.0', '>=1.2.0 <1.6.0', false],
    ['0.37.2', '<0.38 || >=1.0.0', true],
    ['1.2.0', '<0.38 || >=1.0.0', true],
    ['0.50.0', '<0.38 || >=1.0.0', false],
    ['1.0.0-rc1', '>=1.0.0', false],
    ['v1.19.0', '>=1.19.0', true],
  ];
  for (const [version, range, want] of cases) {
    assert.equal(satisfies(version, range), want, `${version} satisfies ${range}`);
  }
});

test('validRange', () => {
  assert.equal(validRange('<0.38'), true);
  assert.equal(validRange('0.44'), true);
  assert.equal(validRange('^1.2 || ~2'), true);
  assert.equal(validRange('not a range'), false);
  assert.equal(validRange('1.2.3.4'), false);
});

test('maxSatisfying', () => {
  const all = ['v0.37.2', 'v0.38.0', 'v0.37.10', 'v1.0.0-rc1', 'v0.36.0', 'weird'];
  assert.equal(maxSatisfying(all, '<0.38'), 'v0.37.10');
  assert.equal(maxSatisfying(all, '>=1'), null);
  assert.equal(maxSatisfying(all, '0.38'), 'v0.38.0');
});
