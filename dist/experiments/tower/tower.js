'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const form = $('#answers');
  const button = $('#submit');
  const task = TASKS[0];
  const fields = expected(task);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Access to localStorage itself can throw in restricted browser contexts.
  let storage;
  try { storage = window.localStorage; } catch { storage = {getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');}}; }
  const state = TowerGame.load(storage);
  if (state.draft.length !== fields.length) state.draft = fields.map(()=>'');
  if (state.pending && state.pending.checks.length !== fields.length) TowerGame.reset(state);
  let phase = 'editing';
  const persist = () => TowerGame.save(storage, state);
  const inputs = () => [...form.querySelectorAll('input')];
  const ready = () => inputs().every(input => validNumber(input.value));
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

  $('#task-title').textContent = task.title;
  let index = 0;
  for (const row of task.rows) {
    const line = document.createElement('label');
    line.className = 'answer-row';
    for (const part of row) {
      if (typeof part === 'string') {
        const text = document.createElement('span'); text.textContent = part; line.append(text);
      } else {
        const input = document.createElement('input');
        input.type='text'; input.inputMode='numeric'; input.pattern='[0-9]*'; input.maxLength=6;
        input.name=`answer-${index}`; input.setAttribute('aria-label',part.label); input.value=state.draft[index] || '';
        line.append(input); index++;
      }
    }
    form.append(line);
  }
  function floor(correct, i, total, animate = false) {
    const block = document.createElement('div');
    block.className = `floor floor-${i%4}${correct?'':' crooked'}${animate?' dropping':''}`;
    block.style.setProperty('--floor',i); block.style.setProperty('--tilt',correct?'0deg':`${i%2?-7:7}deg`);
    block.style.setProperty('--shift',correct?'0px':`${i%2?-11:11}px`);
    for (let j=0;j<2;j++) { const window=document.createElement('span'); window.className='window'; block.append(window); }
    const eyes = document.createElement('span'); eyes.className='resident'; eyes.textContent=i%2?'•ᴗ•':'•‿•'; block.append(eyes);
    if (i===total-1) block.classList.add('top-floor');
    return block;
  }
  function updateCount(n) { $('#floor-count').textContent=`${n} / ${fields.length}`; }
  function lockAnswers(checks) {
    inputs().forEach((input,i)=>{
      input.readOnly=true;
      input.setAttribute('aria-invalid',String(!checks[i]));
      input.dataset.correct=String(checks[i]);
    });
  }
  function setView(city) {
    $('#build-view').hidden=city; $('#city-view').hidden=!city;
    $('#build-tab').classList.toggle('active',!city); $('#city-tab').classList.toggle('active',city);
    $('#build-tab').removeAttribute('aria-current'); $('#city-tab').removeAttribute('aria-current');
    $(city?'#city-tab':'#build-tab').setAttribute('aria-current','page');
    if (city) renderCity();
  }
  function renderCity() {
    const holder = $('#city-buildings'); holder.replaceChildren();
    $('#city-count').textContent=state.buildings.length;
    $('#empty-city').hidden=state.buildings.length>0;
    state.buildings.forEach((building,i)=>{
      const lot=document.createElement('div'); lot.className='city-lot';
      const home=document.createElement('div'); home.className='mini-home';
      home.setAttribute('role','img'); home.setAttribute('aria-label',`${building.name}, этажей: ${building.checks.length}`);
      const base=document.createElement('div'); base.className='foundation'; home.append(base);
      building.checks.forEach((check,j)=>home.append(floor(check,j,building.checks.length)));
      const label=document.createElement('span'); label.textContent=building.name;
      lot.append(home,label); holder.append(lot);
      lot.style.setProperty('--lot-delay',`${i*60}ms`);
    });
    $('#city-summary').textContent=state.buildings.length?`Домов в городе: ${state.buildings.length}. У каждого свой характер.`:'Первый дом появится после задания.';
  }
  function showCompleted() {
    phase='finished';
    const checks=state.pending.checks;
    const correct=checks.filter(Boolean).length;
    $('#crane').hidden=true;
    $('#ground-label').textContent='Новоселье!';
    $('#sky').classList.add('completed');
    $('#scene-caption').textContent=correct===checks.length?'Все этажи на месте. Какой стройный дом!':'У этого дома свой характер. Давай поселим его в городе!';
    $('#feedback').textContent=correct===checks.length?'Все ответы верные. Башня готова!':`Верных ответов: ${correct} из ${checks.length}. Башня готова!`;
    $('#task-hint').textContent='Дом построен. Теперь ему нужно место в твоём городе.';
    button.disabled=false; button.type='button'; button.textContent='В мой город →';
    $('#retry').hidden=false;
    const saved=persist();
    if (!saved) $('#scene-caption').textContent+=' Постройка сохранится только пока открыта страница.';
    $('#city-count').textContent=state.buildings.length;
    $('#tower').setAttribute('aria-label',`Готовая башня, этажей: ${checks.length}. Ровных этажей: ${correct}.`);
  }
  async function build(checks) {
    phase='building'; button.disabled=true; button.textContent='Строим…';
    $('#feedback').textContent='Ответы приняты. Посмотрим, какой получится дом!';
    $('#task-hint').textContent='Кран опускает этажи. Ещё немного — и дом готов.';
    lockAnswers(checks);
    if (window.matchMedia('(max-width: 760px)').matches) $('.scene-card').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'start'});
    $('#crane').classList.add('working');
    for (let i=0;i<checks.length;i++) {
      $('#scene-caption').textContent=`Этаж ${i+1} из ${checks.length} отправляется на место…`;
      const block=floor(checks[i],i,checks.length,!reducedMotion.matches);
      $('#tower').append(block); updateCount(i+1);
      await wait(reducedMotion.matches?30:850);
      block.classList.remove('dropping');
      if (!checks[i] && !reducedMotion.matches) {
        $('#tower').classList.add('wobble');
        await wait(280); $('#tower').classList.remove('wobble');
      }
    }
    TowerGame.finish(state); persist(); showCompleted();
  }
  form.addEventListener('input',event=>{
    if (phase!=='editing' || !(event.target instanceof HTMLInputElement)) return;
    event.target.value=event.target.value.replace(/[^0-9]/g,'');
    state.draft=inputs().map(input=>input.value); persist(); button.disabled=!ready();
    const filled=state.draft.filter(v=>validNumber(v)).length;
    $('#feedback').textContent=filled===fields.length?'Всё заполнено. Можно проверить и запустить кран.':`Заполнено ${filled} из ${fields.length}. Кран ждёт тебя.`;
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if (phase!=='editing' || !ready()) return;
    state.draft=inputs().map(input=>normalize(input.value));
    const checks=evaluate(task,state.draft);
    TowerGame.begin(state,checks,globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    persist(); void build(checks);
  });
  button.addEventListener('click',()=>{if(phase==='finished')setView(true);});
  function reset() {
    if (phase==='building') return;
    TowerGame.reset(state); state.draft=fields.map(()=>''); persist(); phase='editing';
    inputs().forEach(input=>{input.value='';input.readOnly=false;input.removeAttribute('aria-invalid');delete input.dataset.correct;});
    $('#tower').querySelectorAll('.floor').forEach(block=>block.remove());
    $('#tower').setAttribute('aria-label','Пока построен только фундамент');
    $('#sky').classList.remove('completed'); $('#crane').hidden=false; $('#crane').classList.remove('working');
    $('#ground-label').textContent='Место для твоей новой башни'; updateCount(0);
    $('#feedback').textContent='Четыре ответа — четыре этажа.';
    $('#task-hint').textContent='Заполни все окошки. До нажатия «Готово» ответы можно менять.';
    $('#scene-caption').textContent='Кран подождёт. Решай в своём темпе.';
    button.type='submit';button.textContent='Готово →';button.disabled=true;$('#retry').hidden=true;
  }
  $('#retry').addEventListener('click',reset);
  $('#build-tab').addEventListener('click',()=>setView(false));
  $('#city-tab').addEventListener('click',()=>setView(true));
  $('#back-to-build').addEventListener('click',()=>{if(phase==='finished')reset();setView(false);inputs()[0].focus();});
  $('#city-count').textContent=state.buildings.length;
  button.disabled=!ready();
  // Restore an interrupted build once, without duplicating its collection item.
  if (state.pending) {
    lockAnswers(state.pending.checks);
    state.pending.checks.forEach((check,i)=>$('#tower').append(floor(check,i,fields.length)));
    TowerGame.finish(state);updateCount(fields.length);showCompleted();
  }
})();
