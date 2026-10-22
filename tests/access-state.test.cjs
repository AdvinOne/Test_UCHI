const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
function model() {
  const context = vm.createContext({crypto:webcrypto, localStorage:{getItem:()=>null}});
  vm.runInContext(fs.readFileSync('dist/math-data.js','utf8') + fs.readFileSync('dist/access-state.js','utf8') + ';globalThis.api={...AccessState.model,TASKS,expected,emptyState,completedResult,fullAccess:AccessState.fullAccess};', context);
  return context.api;
}
test('Opening a course is free; a start debits once, resumes for free, and restart blocks without destroying progress', () => {
  const api=model(); const account=api.initial();
  assert.equal(account.balance,20);assert.equal(account.attempt,null);
  api.begin(account,'first','none');assert.equal(account.balance,5);
  const id=account.attempt.id;
  api.begin(account,'first','none');api.begin(account,null,null);
  assert.equal(account.balance,5);assert.equal(account.attempt.id,id);
  assert.throws(()=>api.begin(account,'second',id),error=>error.code==='BALANCE');
  assert.equal(account.attempt.id,id);assert.equal(account.eggs,0);
});
test('Balances 0, 5, and 14 cannot start; 15 reaches exactly zero, 20 reaches five; invalid balances fail closed', () => {
  const api=model();
  for(const balance of [0,5,14,15,20]) {
    const account=api.initial();account.balance=balance;
    if(balance<15) {assert.throws(()=>api.begin(account,null,null));assert.equal(account.balance,balance);}
    else {api.begin(account,null,null);assert.equal(account.balance,balance-15);}
  }
  for(const balance of [-1,1.5,NaN,'20',Infinity]) {
    const account=api.initial();account.balance=balance;assert.throws(()=>api.validate(account));
  }
});
test('Eggs are awarded once for completion including incorrect answers; stale saves cannot overwrite a new attempt', () => {
  const api=model();const account=api.initial();api.begin(account,null,null);
  const progress=api.emptyState();progress.current=11;
  progress.attempts=api.TASKS.map(task=>({checked:true,values:api.expected(task).map(item=>String(item.answer))}));
  progress.attempts[0].values[0]='0';
  const id=account.attempt.id;
  api.updateProgress(account,id,0,progress);
  assert.equal(account.eggs,2);assert.equal(account.balance,5);assert.equal(api.completedResult(progress).correctTasks,10);
  api.updateProgress(account,id,1,progress);assert.equal(account.eggs,2);
  assert.throws(()=>api.updateProgress(account,id,0,api.emptyState()));
  api.purchase(account,'order');api.begin(account,'next',id);
  assert.throws(()=>api.updateProgress(account,id,2,progress));
  assert.equal(account.attempt.progress.current,0);assert.equal(account.eggs,2);
});
test('Demo purchase is idempotent, grants one year, never changes beads/eggs; old start URLs never spend again', () => {
  const api=model();const account=api.initial();api.begin(account,'first','none');
  const id=account.attempt.id;
  api.purchase(account,'order');const expires=account.entitlement;
  assert.ok(api.fullAccess(account));assert.ok(expires>Date.now()+360*86400000);
  api.purchase(account,'order');api.purchase(account,'other');
  assert.equal(account.entitlement,expires);assert.equal(account.balance,5);assert.equal(account.eggs,0);
  api.begin(account,'second',id);assert.equal(account.attempt.charged,0);assert.equal(account.balance,5);
  assert.throws(()=>api.begin(account,'first','none'));assert.equal(account.balance,5);
  account.entitlement=Date.now()-1000;
  assert.throws(()=>api.begin(account,'third',account.attempt.id),error=>error.code==='BALANCE');
});
test('Legacy progress is adopted as one prepaid attempt, completed work keeps its result and earns two eggs once', () => {
  const api=model();const progress=api.emptyState();
  progress.attempts[0]={values:['16','7','64','47'],checked:true};progress.current=1;
  const account=api.initial(progress);assert.equal(account.balance,5);assert.equal(account.attempt.progress.current,1);
  progress.current=11;progress.attempts=api.TASKS.map(task=>({checked:true,values:api.expected(task).map(item=>String(item.answer))}));
  const completed=api.initial(progress);assert.equal(completed.eggs,2);assert.equal(completed.attempt.rewarded,true);
});
