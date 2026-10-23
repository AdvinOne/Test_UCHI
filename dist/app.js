'use strict';

// Full math sequence follows the left-to-right order of the Figma section.
// The repeated exercise in № 3 is intentional: it is present in the source.
let state = emptyState();
let session;
let saving = Promise.resolve();
let failed = false;
let actionBusy = false;
const courseUrl = 'course.html?subject=math&work=1';
document.querySelector('#back-to-course').href = courseUrl;
const form = document.querySelector('#answers');
const nextButton = document.querySelector('#continue');
const title = document.querySelector('#title');
const condition = document.querySelector('#condition');
const feedback = document.querySelector('#feedback');
const progress = document.querySelector('.progress');
const fill = document.querySelector('.progress-fill');
document.querySelector('#back-to-course').addEventListener('click',async event=>{
  event.preventDefault();await saving;if(!failed)location.href=courseUrl;
});

function showSaveError(error) {
  failed = true;
  document.querySelector('#exercise').hidden = true;
  const message = document.querySelector('#access-loading');
  message.hidden = false; message.textContent = error.message;
  const link = document.createElement('a'); link.href = 'demo.html'; link.textContent = 'Настройки демо';
  const returnLink = document.createElement('a'); returnLink.href = courseUrl; returnLink.textContent = 'Вернуться к контрольным';
  message.append(document.createElement('br'), returnLink, document.createElement('br'), link);
}
function save() {
  const progress = JSON.parse(JSON.stringify(state));
  saving = saving.then(async () => {
    if (failed) return;
    const account = await AccessState.save(session.id, session.revision, progress);
    session = account.attempt;
    document.querySelector('#account-line').textContent = `Бусины: ${account.balance} · Яйца: ${account.eggs} · ${AccessState.fullAccess(account) ? 'Демо-доступ открыт' : 'Эта попытка уже оплачена'}`;
  }).catch(showSaveError);
  return saving;
}

function render(focusHeading = false) {
  form.replaceChildren();
  feedback.textContent = '';
  const completed = state.attempts.filter(a => a?.checked).length;
  progress.setAttribute('aria-valuenow', String(completed));
  fill.style.width = `${completed / TASKS.length * 100}%`;
  if (state.current === TASKS.length) {
    document.querySelector('#exercise').hidden = true;
    location.replace(courseUrl);
    return;
  }
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
    const img=document.createElement('img'); img.src='assets/rectangles-source.png'; img.alt='';
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
  nextButton.textContent=checked ? 'Далее' : 'Готово';
  nextButton.disabled=!checked && !isComplete();
}
async function commitAnswers(values) {
  state.attempts[state.current]={values,checked:true}; await save(); if (!failed) showChecked(TASKS[state.current],values);
}
function storeDraft() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  state.attempts[state.current] = {values:getInputs().map(input => input.value), checked:false};
  save();
  updateAction();
}
async function checkIfComplete() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  if (!isComplete()) return;
  const fields=expected(TASKS[state.current]);
  const values=draftValues().map((value,i)=>fields[i].options ? value : normalize(value));
  await commitAnswers(values);
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
nextButton.addEventListener('click', async () => {
  if (nextButton.disabled || failed || actionBusy) return;
  actionBusy = true;
  nextButton.disabled = true;
  try {
    await saving;
    if (failed) return;
    if (state.current === TASKS.length) {
      location.replace(courseUrl); return;
    }
    if (!state.attempts[state.current]?.checked) { await checkIfComplete(); return; }
    state.current++;
    await save(); if (failed) return; render(true); window.scrollTo({top:0, behavior:'instant'});
  } finally {
    actionBusy = false;
  }
});

async function startExercise() {
  try {
    await AccessState.open();
    const params = new URLSearchParams(location.search);
    const account = await AccessState.start(params.get('start'), params.get('previous'));
    session = account.attempt; state = session.progress;
    document.querySelector('#account-line').textContent = `Бусины: ${account.balance} · Яйца: ${account.eggs} · ${AccessState.fullAccess(account) ? 'Демо-доступ открыт' : 'За старт списано 15 бусин'}`;
    document.querySelector('#access-loading').hidden = true;
    document.querySelector('#exercise').hidden = false;
    render();
  } catch (error) {
    if (error.code === 'BALANCE') {
      const params = new URLSearchParams(location.search);
      location.replace(`access.html?${params.toString()}#captcha`);
    } else showSaveError(error);
  }
}
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
startExercise();
