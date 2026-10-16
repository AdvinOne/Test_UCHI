'use strict';

// A task-agnostic adapter: the game receives only final true/false answers.
// No course state or course storage key is read or written here.
globalThis.TowerGame = (() => {
  const STORAGE_KEY = 'uchi-experiment-tower-v1';
  const newState = () => ({version:1, draft:[], pending:null, buildings:[]});
  const validChecks = checks => Array.isArray(checks) && checks.length > 0 && checks.length <= 40 && checks.every(x => typeof x === 'boolean');
  function load(storage) {
    try {
      const s = JSON.parse(storage.getItem(STORAGE_KEY));
      if (s?.version !== 1 || !Array.isArray(s.draft) || s.draft.some(v => typeof v !== 'string' || !/^\d{0,6}$/.test(v)) || !Array.isArray(s.buildings)) return newState();
      if (s.buildings.some(b => !b || typeof b.id !== 'string' || typeof b.name !== 'string' || !validChecks(b.checks))) return newState();
      if (s.pending !== null && (!s.pending || typeof s.pending.id !== 'string' || !validChecks(s.pending.checks))) return newState();
      return s;
    } catch { return newState(); }
  }
  function save(storage, state) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
  }
  function begin(state, checks, id) {
    if (!validChecks(checks)) throw new Error('Expected final answer results.');
    if (!state.pending) state.pending = {id, checks:[...checks]};
    return state.pending;
  }
  function finish(state) {
    if (!state.pending) return null;
    let building = state.buildings.find(b => b.id === state.pending.id);
    if (!building) {
      building = {...state.pending, name:`Башня № ${state.buildings.length + 1}`};
      state.buildings.push(building);
    }
    return building;
  }
  function reset(state) { state.draft = []; state.pending = null; }
  return {STORAGE_KEY, newState, load, save, begin, finish, reset};
})();
