const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function model(stored=null){
 const ctx=vm.createContext({localStorage:{getItem:()=>stored}});
 vm.runInContext(fs.readFileSync('dist/math-data.js','utf8')+';globalThis.api={TASKS,INPUT_TASKS,expected,evaluate,loadState,emptyState,completedResult};',ctx);
 return ctx.api;
}
test('Full sequence has 11 screens and 37 answers with the three new steps in place',()=>{
 const a=model(); assert.equal(a.TASKS.length,11); assert.equal(a.TASKS.reduce((n,t)=>n+a.expected(t).length,0),37);
 assert.equal(a.TASKS[5].source,'3775:15708'); assert.equal(a.TASKS[6].source,'3775:15693'); assert.equal(a.TASKS[8].source,'3775:15681');
 assert.deepEqual(Array.from(a.evaluate(a.TASKS[5],['=','<','>'])),[true,true,true]);
 assert.deepEqual(Array.from(a.evaluate(a.TASKS[8],['3'])),[true]); assert.deepEqual(Array.from(a.evaluate(a.TASKS[8],['1'])),[false]);
});
test('Migrates a completed eight-input attempt without losing its answers or granting a full grade',()=>{
 const a=model();const attempts=a.INPUT_TASKS.map(t=>({checked:true,values:a.expected(t).map(f=>String(f.answer))}));
 const b=model(JSON.stringify({version:1,current:8,attempts})); const s=b.loadState();
 assert.equal(s.current,5); assert.equal(s.version,2); assert.equal(s.attempts.filter(x=>x?.checked).length,8);
 assert.equal(s.attempts[7].values[6],'20');assert.equal(s.attempts[9].values[0],'21'); assert.equal(s.attempts[10].values[0],'36');
 assert.equal(b.completedResult(s),null);
});
test('Full results include choices and grade; invalid persisted selections are rejected',()=>{
 const a=model();const s=a.emptyState();s.current=11;s.attempts=a.TASKS.map(t=>({checked:true,values:a.expected(t).map(f=>String(f.answer))}));
 assert.equal(a.completedResult(s).grade,5);assert.equal(a.completedResult(s).correctFields,37);
 s.attempts[5].values[0]='>';assert.equal(a.completedResult(s).correctTasks,10);assert.equal(a.completedResult(s).grade,4);
 s.attempts[8].values[0]='999';assert.equal(model(JSON.stringify(s)).loadState().current,0);
});
