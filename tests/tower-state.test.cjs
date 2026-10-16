const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function model(initial={}){
 const data={...initial}; const reads=[],writes=[];
 const storage={getItem:key=>{reads.push(key);return data[key]??null;},setItem:(key,value)=>{writes.push(key);data[key]=value;}};
 const ctx=vm.createContext({});
 vm.runInContext(fs.readFileSync('dist/experiments/tower/tower-engine.js','utf8'),ctx);
 return {game:ctx.TowerGame,storage,data,reads,writes};
}
test('Experiment never reads or writes the original course result',()=>{
 const original='{"version":2,"current":7,"attempts":[]}';
 const a=model({'uchi-math-inputs-v1':original}); const s=a.game.load(a.storage);
 a.game.begin(s,[true,false,true,false],'attempt-one'); a.game.finish(s);a.game.save(a.storage,s);
 assert.equal(a.data['uchi-math-inputs-v1'],original);
 assert.deepEqual(a.reads,['uchi-experiment-tower-v1']);assert.deepEqual(a.writes,['uchi-experiment-tower-v1']);
});
test('Reload during animation preserves answers and creates exactly one building',()=>{
 const a=model(); const s=a.game.newState();s.draft=['16','8','64','48'];
 a.game.begin(s,[true,false,true,false],'attempt-one');a.game.save(a.storage,s);
 const restored=a.game.load(a.storage);a.game.finish(restored);a.game.finish(restored);a.game.save(a.storage,restored);
 const again=a.game.load(a.storage);a.game.finish(again);
 assert.equal(again.buildings.length,1);assert.deepEqual(Array.from(again.draft),['16','8','64','48']);
 assert.deepEqual(Array.from(again.buildings[0].checks),[true,false,true,false]);
 a.game.reset(again);assert.equal(again.pending,null);assert.equal(again.buildings.length,1);
 a.game.begin(again,[true,true,true,true],'attempt-two');a.game.finish(again);assert.equal(again.buildings.length,2);
});
test('Broken or blocked storage falls back to a playable empty state',()=>{
 const a=model({'uchi-experiment-tower-v1':'{broken'});assert.equal(a.game.load(a.storage).buildings.length,0);
 const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 const s=a.game.load(blocked);a.game.begin(s,[false],'attempt');assert.equal(a.game.finish(s).checks[0],false);
 assert.equal(a.game.save(blocked,s),false);
});
