'use strict';

// Only this adapter knows about exercises. The tower receives final booleans.
globalThis.TowerWork = (() => {
  const KEY = 'uchi-experiment-tower-work-v2';
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const fresh = (buildings = []) => ({version:2, runId:id(), work:emptyState(), buildings});
  const validBuilding = b => b && typeof b.id === 'string' && typeof b.name === 'string' && Array.isArray(b.checks) && b.checks.length > 0 && b.checks.length <= 40 && b.checks.every(x => typeof x === 'boolean');
  function validWork(work) {
    if (!work || work.version !== 2 || !Number.isInteger(work.current) || work.current < 0 || work.current > TASKS.length || !Array.isArray(work.attempts) || work.attempts.length !== TASKS.length) return false;
    return work.attempts.every((a,i) => {
      if (i < work.current && !a?.checked) return false;
      if (i > work.current && a !== null) return false;
      if (a === null) return true;
      const fields = expected(TASKS[i]);
      return a && typeof a.checked === 'boolean' && Array.isArray(a.values) && a.values.length === fields.length && a.values.every((v,j) => typeof v === 'string' && (a.checked ? validValue(fields[j],v) : v === '' || validValue(fields[j],v)));
    });
  }
  function load(storage) {
    let saved;
    try { saved = JSON.parse(storage.getItem(KEY)); } catch { return fresh(); }
    if (saved?.version === 2 && Array.isArray(saved.buildings) && saved.buildings.every(validBuilding)) {
      if (typeof saved.runId === 'string' && validWork(saved.work)) return saved;
      return fresh(saved.buildings);
    }
    // Preserve houses built in the earlier single-task experiment.
    let previous;
    try { previous = JSON.parse(storage.getItem('uchi-experiment-tower-v1')); } catch { /* Start empty. */ }
    return fresh(Array.isArray(previous?.buildings) ? previous.buildings.filter(validBuilding) : []);
  }
  function save(storage,state) {
    try { storage.setItem(KEY,JSON.stringify(state)); return true; } catch { return false; }
  }
  function draft(state,values) {
    const i = state.work.current;
    if (i >= TASKS.length || state.work.attempts[i]?.checked) return false;
    const fields = expected(TASKS[i]);
    if (values.length !== fields.length || values.some((v,j) => typeof v !== 'string' || v !== '' && !validValue(fields[j],v))) return false;
    state.work.attempts[i] = {values:[...values],checked:false};
    return true;
  }
  function check(state) {
    const i = state.work.current, attempt = state.work.attempts[i];
    if (i >= TASKS.length || !attempt || attempt.checked || !expected(TASKS[i]).every((f,j) => validValue(f,attempt.values[j]))) return null;
    attempt.values = attempt.values.map((v,j) => expected(TASKS[i])[j].options ? v : normalize(v));
    attempt.checked = true;
    return evaluate(TASKS[i],attempt.values).every(Boolean);
  }
  function checks(state) {
    return state.work.attempts.flatMap((a,i) => a?.checked ? [evaluate(TASKS[i],a.values).every(Boolean)] : []);
  }
  function finish(state) {
    if (!completedResult(state.work)) return null;
    let building = state.buildings.find(b => b.id === state.runId);
    if (!building) {
      building = {id:state.runId, name:`Дом № ${state.buildings.length+1}`, checks:checks(state), grade:completedResult(state.work).grade};
      state.buildings.push(building);
    }
    return building;
  }
  function next(state) {
    if (state.work.current >= TASKS.length || !state.work.attempts[state.work.current]?.checked) return false;
    state.work.current++;
    if (state.work.current === TASKS.length) finish(state);
    return true;
  }
  function reset(state) { state.runId=id(); state.work=emptyState(); }
  return {KEY,fresh,load,save,draft,check,checks,next,finish,reset};
})();
