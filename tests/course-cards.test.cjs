const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cards = require('../dist/course-cards.js');

test('Desktop previews use the available third-grade Figma variants for all four subjects', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(cards.previews).map(([subject,previews])=>[subject,previews.length])),{math:2,world:2,russian:2,reading:4});
  for (const preview of Object.values(cards.previews).flat()) {
    assert.match(preview.node,/^3957:/);
    const svg=fs.readFileSync(path.join(__dirname,'../dist/assets/figma-desktop',preview.file),'utf8');
    assert.match(svg,/width="266"/);
    assert.match(svg,/height="200"/);
    assert.ok(preview.alt);
  }
});

test('Figma grade badges distinguish retry, orange 3/4 and green 5 without a numeric badge for grade 2', () => {
  assert.equal(cards.gradeBadge(2).label,'Попробуй ещё раз');
  assert.equal(cards.gradeBadge(2).color,'#ff6170');
  assert.equal(cards.gradeBadge(3).label,'Оценка 3');
  assert.equal(cards.gradeBadge(4).color,'#ff8811');
  assert.equal(cards.gradeBadge(5).color,'#10c84e');
  assert.equal(cards.gradeBadge(null),null);
  assert.equal(cards.gradeBadge(0),null);
  for (const grade of [2,3,4,5]) assert.ok(fs.existsSync(path.join(__dirname,'../dist/assets/figma-desktop',cards.gradeBadge(grade).file)));
});
