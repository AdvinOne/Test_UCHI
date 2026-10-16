'use strict';
(() => {

// Full math sequence follows the left-to-right order of the Figma section.
// The repeated exercise in № 3 is intentional: it is present in the source.
let storage;
try { storage=window.localStorage; } catch { storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}}; }
const experiment=TowerWork.load(storage);
let state=experiment.work;
let busy=false;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const courseUrl = 'course.html?subject=math&work=2';

const form = document.querySelector('#answers');
const nextButton = document.querySelector('#continue');
const title = document.querySelector('#title');
const condition = document.querySelector('#condition');
const feedback = document.querySelector('#feedback');
const progress = document.querySelector('.progress');
const fill = document.querySelector('.progress-fill');

function save() { const ok=TowerWork.save(storage,experiment); document.querySelector('#storage-note').hidden=ok; }

function render(focusHeading = false) {
  document.querySelector('.task-area').classList.toggle('is-results',state.current===TASKS.length);
  title.classList.toggle('result-title',state.current===TASKS.length);
  renderScene();
  form.replaceChildren();
  feedback.textContent = '';
  const completed = state.attempts.filter(a => a?.checked).length;
  progress.setAttribute('aria-valuenow', String(completed));
  fill.style.width = `${completed / TASKS.length * 100}%`;
  if (state.current === TASKS.length) { renderResults(); return; }
  const task = TASKS[state.current];
  title.textContent = task.title;
  condition.hidden = !task.condition;
  condition.textContent = task.condition || '';
  document.querySelector('#counter').textContent = `Задание ${task.number} из ${TASKS.length}`;
  form.dataset.sourceNode = task.source;
  form.dataset.kind = task.kind;
  progress.setAttribute('aria-valuemax', String(TASKS.length));
  const attempt = state.attempts[state.current];
  let fieldIndex = 0;
  for (const row of task.rows) {
    const div = document.createElement('div');
    div.className = 'answer-row';
    if (!row.some(part => typeof part === 'object')) div.classList.add('text-row');
    if (task.inputNumber === 4 && (row[0] === 't − 64 = 21')) div.classList.add('section-gap');
    for (const part of row) {
      if (typeof part === 'string') {
        const span = document.createElement('span');
        span.textContent = part;
        if (!/[а-яё]/i.test(part)) span.className = 'math';
        div.append(span);
      } else {
        const input = document.createElement(part.options ? 'select' : 'input');
        input.className = part.options ? `answer-select${task === TASKS[5] ? ' answer-select-small' : ' answer-select-plan'}` : 'answer-field';
        if (part.options) {
          const placeholder = document.createElement('option');
          placeholder.value = ''; placeholder.textContent = '...'; placeholder.disabled = true;
          input.append(placeholder);
          for (const value of part.options) {
            const option=document.createElement('option'); option.value=value; option.textContent=value; input.append(option);
          }
        } else {
          input.type = 'text'; input.inputMode = 'numeric'; input.pattern = '[0-9]*';
          input.maxLength = 6; input.spellcheck = false;
        }
        input.name = `answer-${fieldIndex}`;
        input.setAttribute('aria-label', part.label);
        input.value = attempt?.values[fieldIndex] || '';
        div.append(input);
        fieldIndex++;
      }
    }
    form.append(div);
  }
  if (task.kind === 'pictures') renderPictures(task, attempt);
  updateAction();
  if (attempt?.checked) showChecked(task, attempt.values);
  if (focusHeading) title.focus();
}

function renderPictures(task, attempt) {
  const grid=document.createElement('div'); grid.className='picture-grid';
  grid.setAttribute('role','group'); grid.setAttribute('aria-label','Выбери прямоугольник');
  for (const choice of task.choices) {
    const button=document.createElement('button'); button.type='button'; button.className='picture-choice';
    button.dataset.value=choice.value; button.setAttribute('aria-label',`Прямоугольник ${choice.value}`);
    button.setAttribute('aria-pressed',String(attempt?.values[0]===choice.value));
    const number=document.createElement('span'); number.className='picture-number'; number.textContent=choice.value;
    const crop=document.createElement('span'); crop.className='picture-window'; crop.setAttribute('aria-hidden','true');
    const img=document.createElement('img'); img.src='../../assets/rectangles-source.png'; img.alt='';
    // Use the uploaded source image unchanged, clipping only the diagram slots.
    img.style.width=`${2058/340*100}%`; img.style.left=`${-choice.x/340*100}%`; img.style.top=`${-choice.y/340*100}%`;
    crop.append(img); button.append(number,crop); grid.append(button);
    button.addEventListener('click',()=>{
      if (state.attempts[state.current]?.checked) return;
      state.attempts[state.current]={values:[choice.value],checked:false};
      save();
      grid.querySelectorAll('.picture-choice').forEach(card=>card.setAttribute('aria-pressed',String(card===button)));
      updateAction();
    });
  }
  form.append(grid);
}
function getInputs() { return [...form.querySelectorAll('input,select')]; }
function draftValues() {
  return TASKS[state.current].kind==='pictures' ? (state.attempts[state.current]?.values || []) : getInputs().map(input=>input.value);
}
function isComplete() {
  const fields=expected(TASKS[state.current]);
  const values=draftValues();
  return values.length===fields.length && fields.every((field,i)=>validValue(field,values[i]));
}
function updateAction() {
  const checked=state.attempts[state.current]?.checked;
  nextButton.textContent=busy ? 'Строим…' : checked ? (state.current===TASKS.length-1 ? 'Результат' : 'Далее') : 'Готово';
  nextButton.disabled=busy || (!checked && !isComplete());
}
function commitAnswers(values) {
  TowerWork.draft(experiment,values);
  const correct=TowerWork.check(experiment);
  if(correct===null)return;
  save(); showChecked(TASKS[state.current],values);
  renderScene(true);
  if(!reducedMotion.matches){busy=true;updateAction();window.setTimeout(()=>{busy=false;updateAction();},720);}

}
function storeDraft() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  state.attempts[state.current] = {values:getInputs().map(input => input.value), checked:false};
  save();
  updateAction();
}
function checkIfComplete() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  if (!isComplete()) return;
  const fields=expected(TASKS[state.current]);
  const values=draftValues().map((value,i)=>fields[i].options ? value : normalize(value));
  commitAnswers(values);
}
function showChecked(task, values) {
  const checks = evaluate(task, values);
  getInputs().forEach((input, i) => {
    input.value = values[i];
    if (input instanceof HTMLSelectElement) { input.disabled=true; input.dataset.correct=String(checks[i]); }
    else input.readOnly = true;
    input.setAttribute('aria-invalid', String(!checks[i]));
    input.setAttribute('aria-description', checks[i] ? 'Ответ принят. Изменить нельзя.' : 'Неверный ответ. Изменить нельзя.');
  });
  if (task.kind==='pictures') {
    form.querySelectorAll('.picture-choice').forEach(button=>{
      const selected=button.dataset.value===values[0];
      button.disabled=true; button.setAttribute('aria-pressed',String(selected));
      if (selected) { button.dataset.correct=String(checks[0]); button.setAttribute('aria-invalid',String(!checks[0])); }
    });
  }
  updateAction();
  const completed = state.attempts.filter(a => a?.checked).length;
  progress.setAttribute('aria-valuenow', String(completed));
  fill.style.width = `${completed / TASKS.length * 100}%`;
  feedback.textContent = checks.every(Boolean) ? 'Ответы проверены. Можно продолжить.' : 'Ответы проверены. Неверные ответы выделены красным. Можно продолжить.';
}

form.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement)) return;
  if (state.attempts[state.current]?.checked) {
    event.target.value = state.attempts[state.current].values[Number(event.target.name.split('-')[1])];
    return;
  }
  event.target.value = event.target.value.replace(/[^0-9]/g, '');
  storeDraft();
});
form.addEventListener('change', event=>{
  if (!(event.target instanceof HTMLSelectElement)) return;
  if (state.attempts[state.current]?.checked) return;
  storeDraft();
});
form.addEventListener('submit', event => event.preventDefault());
nextButton.addEventListener('click', () => {
  if(busy)return;
  if (state.current === TASKS.length) {
    TowerWork.reset(experiment);state=experiment.work; save(); render(true); return;
  }
  if (!state.attempts[state.current]?.checked) { checkIfComplete(); return; }
  if(busy || !TowerWork.next(experiment))return;
  save(); render(true); window.scrollTo({top:0, behavior:'instant'});
});

function renderResults() {
  TowerWork.finish(experiment); save(); renderScene();
  title.textContent = 'Все задания выполнены!';
  condition.hidden = true;
  document.querySelector('#counter').textContent = 'КР №2 (октябрь) · Математика · 3 класс';
  const {grade, correctTasks, correctFields, totalFields} = completedResult(state);
  const summary = document.createElement('div'); summary.className='result';
  const badge=document.createElement('div');badge.className='result-grade';badge.textContent=grade;badge.setAttribute('aria-label',`Твоя оценка: ${grade}`);
  summary.append(badge);
  for(const text of [`Твоя оценка: ${grade}`,`Заданий без ошибок: ${correctTasks} из ${TASKS.length}`,`Верных ответов: ${correctFields} из ${totalFields}`]) {
    const line=document.createElement('p');line.textContent=text;summary.append(line);
  }
  const note=document.createElement('p');note.className='result-caption';note.textContent='Дом готов и уже поселился в твоём городе. В следующей контрольной построишь новый!';
  const actions=document.createElement('div');actions.className='result-actions';
  const city=document.createElement('button');city.type='button';city.className='secondary-button';city.textContent='Посмотреть мой город';city.addEventListener('click',()=>setView(true));
  const back=document.createElement('a');back.className='secondary-button';back.href=courseUrl;back.textContent='К контрольным работам';
  actions.append(city,back);summary.append(note,actions);form.append(summary);
  nextButton.textContent = 'Пройти ещё раз';nextButton.disabled=false;title.focus();
}


const colors=[['#b9a5f5','#9278db'],['#f6d68d','#d8b362'],['#a8d8c6','#7ab29d'],['#c6c0f5','#9d94d5'],['#f2bca8','#d49982']];
function floorSvg(check,i,step,last,animate){
  const [color,stroke]=colors[i%colors.length];
  const tilt=check?0:i%2?-5:5,shift=check?0:i%2?-7:7;
  const windows=step<17?'':`<rect x="15" y="5" width="18" height="${step-9}" rx="3" fill="#fff9df"/><rect x="67" y="5" width="18" height="${step-9}" rx="3" fill="#fff9df"/><path d="M24 5v${step-9}M76 5v${step-9}" stroke="${stroke}" stroke-opacity=".45"/>`;
  return `<g transform="translate(${100+shift} ${366-i*step})"><g class="tower-floor${animate?' landing':''}"><g transform="rotate(${tilt} 50 ${step})"><rect width="100" height="${step+1}" rx="4" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>${windows}${last?'<path d="M-8 0L50 -24L108 0Z" fill="#8e74df" stroke="#765ac8" stroke-width="2"/><path d="M50 -24v-13h23l-5 6 5 7H50" fill="#f5d782" stroke="#d8b362" stroke-width="1.5"/>':''}</g></g></g>`;
}
function houseSvg(checks,{animate=false,finished=false,city=false}={}){
  const total=checks.length,step=Math.min(24,264/Math.max(11,total));
  const scenery=`<circle cx="244" cy="53" r="20" fill="#f7df9e"/><path d="M33 64h49a10 10 0 0 0-9-11 14 14 0 0 0-25-5 9 9 0 0 0-15 16M205 128h36a7 7 0 0 0-7-9 11 11 0 0 0-19-4 7 7 0 0 0-10 13" fill="#fff"/><g fill="#e4e0f0"><rect x="10" y="325" width="34" height="62" rx="5"/><rect x="41" y="343" width="25" height="44" rx="3"/><rect x="231" y="311" width="35" height="76" rx="5"/><rect x="271" y="334" width="25" height="53" rx="3"/></g><path d="M0 388Q75 374 150 387Q225 374 300 387V440H0Z" fill="#e8e7ee"/><path d="M0 417Q150 403 300 418" fill="none" stroke="#dedbe7" stroke-width="2"/>`;
  const crane=finished||city?'':`<g stroke="#bfa557" stroke-width="2" fill="#f4d582"><path d="M242 387V61h12v326"/><path d="M243 64l11 17-11 17 11 17-11 17 11 17-11 17 11 17-11 17 11 17-11 17 11 17-11 17 11 17-11 17 11 17-11 17 11 17-11 17 11 17" fill="none" stroke-width="1"/><rect x="96" y="58" width="172" height="10" rx="3"/><path d="M150 68v18" stroke="#a7a1b5" fill="none"/></g><g class="waiting-floor" opacity="${animate?0:1}"><rect x="106" y="86" width="88" height="22" rx="4" fill="${colors[total%colors.length][0]}" stroke="${colors[total%colors.length][1]}" stroke-width="1.5"/><rect x="119" y="91" width="14" height="12" rx="2" fill="#fff9df"/><rect x="167" y="91" width="14" height="12" rx="2" fill="#fff9df"/><path d="M145 98q5 5 10 0" fill="none" stroke="#76618d" stroke-width="1.5"/></g>`;
  let floors=checks.map((check,i)=>floorSvg(check,i,step,finished&&i===total-1,animate&&i===total-1)).join('');
  const builder=`<g transform="translate(57 356)"><path d="M5 30v-10q10-7 20 0v10" fill="#a893e8" stroke="#8b77c5" stroke-width="1.5"/><rect x="5" y="3" width="20" height="19" rx="7" fill="#f5d7b7" stroke="#d2b393" stroke-width="1.5"/><path d="M2 8h26M6 7q0-17 18 0" stroke="#c7a24b" stroke-width="2" fill="#f5d782"/><path d="M12 12v2m7-2v2" stroke="#635571" stroke-width="2" stroke-linecap="round"/></g>`;
  return scenery+crane+`<g class="${animate&&!checks.at(-1)?'tower-bounce':''}"><rect x="91" y="389" width="118" height="10" rx="3" fill="#c2bccc"/>${floors}${total?'<path d="M139 390v-13a11 11 0 0 1 22 0v13" fill="#8c7fa3" stroke="#77688e" stroke-width="1.5"/><circle cx="155" cy="382" r="1.5" fill="#f7df9e"/>':''}</g>`+(!city?builder:'');
}
function renderScene(animate=false){
  const checks=TowerWork.checks(experiment),finished=checks.length===TASKS.length;
  const scene=document.querySelector('#tower-scene');scene.innerHTML=houseSvg(checks,{animate,finished});
  scene.setAttribute('aria-label',`Дом: ${checks.length} из ${TASKS.length} этажей. Ровных этажей: ${checks.filter(Boolean).length}.`);
  document.querySelector('#floor-count').textContent=`${checks.length} из ${TASKS.length} этажей`;
  const caption=document.querySelector('#building-caption');
  caption.textContent=finished?'Дом готов! Он появится в городе вместе с результатом контрольной.':animate?(checks.at(-1)?'Этаж встал ровно! Можно переходить к следующему заданию.':'Этаж чуть накренился. Продолжим строить!'):checks.length?'Дом растёт. Кран подождёт, пока ты решаешь следующее задание.':'Решай задания — строй свой дом. Одно задание — один этаж.';
  if(state.current===TASKS.length)caption.textContent='Твой дом уже в городе. Следующая контрольная — новая постройка!';
  document.querySelector('#city-count').textContent=experiment.buildings.length;
}
function renderCity(){
  const holder=document.querySelector('#city-houses');holder.replaceChildren();
  document.querySelector('#empty-city').hidden=experiment.buildings.length>0;
  experiment.buildings.forEach(building=>{
    const lot=document.createElement('article');lot.className='city-lot';
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 300 440');svg.setAttribute('role','img');svg.setAttribute('aria-label',`${building.name}: ${building.checks.length} этажей`);svg.innerHTML=houseSvg(building.checks,{finished:true,city:true});
    const label=document.createElement('p');label.textContent=building.name;
    const meta=document.createElement('small');meta.textContent=building.grade?`Математика · Оценка ${building.grade}`:'Пробная постройка';
    lot.append(svg,label,meta);holder.append(lot);
  });
  document.querySelector('#city-summary').textContent=experiment.buildings.length?`Домов в твоём городе: ${experiment.buildings.length}`:'Первый дом появится после контрольной.';
  document.querySelector('#back-to-work').textContent=state.current===TASKS.length?'К результату':'Продолжить контрольную';
}
function setView(city,focus=true){
  document.querySelector('#work-view').hidden=city;document.querySelector('#city-view').hidden=!city;
  const toggle=document.querySelector('#city-toggle');toggle.setAttribute('aria-pressed',String(city));
  if(city)renderCity();
  history.replaceState(null,'',location.pathname+location.search+(city?'#city':''));
  if(focus)(city?document.querySelector('#city-title'):title).focus();
}
document.querySelector('#city-toggle').addEventListener('click',()=>setView(document.querySelector('#city-view').hidden));
document.querySelector('#back-to-work').addEventListener('click',()=>setView(false));
window.addEventListener('hashchange',()=>setView(location.hash==='#city'));
render();
setView(location.hash==='#city',false);

})();
