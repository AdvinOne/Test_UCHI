const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function model(initial={}) {
  const data={...initial},reads=[],writes=[];
  const storage={getItem:k=>{reads.push(k);return data[k]??null;},setItem:(k,v)=>{writes.push(k);data[k]=v;}};
  const ctx=vm.createContext({});
  vm.runInContext(fs.readFileSync('dist/math-data.js','utf8')+'\n'+fs.readFileSync('dist/experiments/tower/work-engine.js','utf8')+'\nglobalThis.api={game:TowerWork,TASKS,expected,completedResult};',ctx);
  return {...ctx.api,storage,data,reads,writes};
}
const answers=(m,i)=>m.expected(m.TASKS[i]).map(f=>String(f.answer));
test('Only explicit confirmation creates one floor per task; locked answers cannot be changed',()=>{
  const m=model(),s=m.game.fresh();
  assert.equal(m.game.next(s),false);
  m.game.draft(s,['16','','64','47']);assert.equal(m.game.check(s),null);assert.equal(m.game.checks(s).length,0);
  m.game.draft(s,['16','8','64','47']);assert.equal(m.game.checks(s).length,0);
  assert.equal(m.game.check(s),false);assert.deepEqual(Array.from(m.game.checks(s)),[false]);
  assert.equal(m.game.check(s),null);assert.equal(m.game.draft(s,answers(m,0)),false);
  assert.equal(m.game.next(s),true);assert.equal(s.work.current,1);assert.equal(m.game.checks(s).length,1);
});
test('Eleven screens including dropdowns and picture choice produce one complete house and grade',()=>{
  const m=model(),s=m.game.fresh();
  for(let i=0;i<m.TASKS.length;i++) {
    const values=answers(m,i);if(i===5)values[0]='>';if(i===8)values[0]='1';
    assert.equal(m.game.draft(s,values),true);assert.equal(m.game.check(s),i!==5&&i!==8);
    assert.equal(m.game.checks(s).length,i+1);assert.equal(s.buildings.length,0);
    assert.equal(m.game.next(s),true);
  }
  assert.equal(m.completedResult(s.work).grade,4);assert.equal(s.buildings.length,1);assert.equal(s.buildings[0].checks.length,11);
  m.game.finish(s);m.game.finish(s);assert.equal(s.buildings.length,1);
  m.game.save(m.storage,s);const restored=m.game.load(m.storage);m.game.finish(restored);assert.equal(restored.buildings.length,1);
  m.game.reset(restored);assert.equal(restored.work.current,0);assert.equal(restored.buildings.length,1);assert.notEqual(restored.runId,s.runId);
});
test('Reload preserves unchecked drafts and checked floors without altering ordinary course storage',()=>{
  const original='original-course-result';const m=model({'uchi-math-inputs-v1':original}),s=m.game.load(m.storage);
  m.game.draft(s,answers(m,0));m.game.check(s);m.game.save(m.storage,s);
  let restored=m.game.load(m.storage);assert.equal(restored.work.current,0);assert.equal(m.game.checks(restored).length,1);
  m.game.next(restored);m.game.draft(restored,['9','','']);m.game.save(m.storage,restored);
  restored=m.game.load(m.storage);assert.deepEqual(Array.from(restored.work.attempts[1].values),['9','','']);
  assert.equal(m.data['uchi-math-inputs-v1'],original);assert.equal(m.reads.includes('uchi-math-inputs-v1'),false);
  assert.ok(m.writes.every(k=>k===m.game.KEY));
});
test('Earlier demo houses migrate once; corrupt progress retains the collection; blocked storage remains playable',()=>{
  const house={id:'demo',name:'Башня № 1',checks:[true,false,true,true]};
  const m=model({'uchi-experiment-tower-v1':JSON.stringify({version:1,buildings:[house]})});
  const s=m.game.load(m.storage);assert.equal(s.buildings.length,1);m.game.save(m.storage,s);
  assert.equal(m.game.load(m.storage).buildings.length,1);
  s.work.current=8;m.game.save(m.storage,s);assert.equal(m.game.load(m.storage).work.current,0);assert.equal(m.game.load(m.storage).buildings.length,1);
  const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
  const fallback=m.game.load(blocked);m.game.draft(fallback,answers(m,0));assert.equal(m.game.check(fallback),true);assert.equal(m.game.save(blocked,fallback),false);
});
