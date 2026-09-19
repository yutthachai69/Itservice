/* eslint-disable @typescript-eslint/no-require-imports -- This standalone Node check intentionally uses CommonJS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/ticket-date-filter.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exportsObject = {};
new Function('exports', compiled)(exportsObject);
const { ticketDateFilter } = exportsObject;

assert.equal(ticketDateFilter('2026-09-12T07:00:00+07:00'), '2026-09-12T00:00:00.000Z');
assert.equal(ticketDateFilter('2026-09-12T00:00:00.123Z'), '2026-09-12T00:00:00.123Z');
for (const value of [null, undefined, '', 'bad', '2026-09-12', '2026-99-99T00:00:00Z']) {
  assert.equal(ticketDateFilter(value), '');
}
const cutoff = ticketDateFilter('2026-09-12T07:00:00+07:00');
const query = new URLSearchParams({ createdFrom: cutoff, closedFrom: cutoff });
assert.equal(ticketDateFilter(query.get('createdFrom')), cutoff);
assert.equal(ticketDateFilter(query.get('closedFrom')), cutoff);
console.log('Ticket date cutoff checks passed (timezone, precision, invalid input, URL round-trip).');
