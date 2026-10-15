'use strict';

// Numbers and source nodes follow the annotations in «Математика 3 кл».
// The repeated exercise in № 3 is intentional: it is present in the source.
const state = loadState();
const courseUrl = 'course.html?subject=math&work=2';
document.querySelector('#back-to-course').href = courseUrl;
const form = document.querySelector('#answers');
const nextButton = document.querySelector('#continue');
const title = document.querySelector('#title');
const condition = document.querySelector('#condition');
const feedback = document.querySelector('#feedback');
const progress = document.querySelector('.progress');
const fill = document.querySelector('.progress-fill');

function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* The exercise also works when storage is unavailable. */ } }

function render(focusHeading = false) {
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
  const attempt = state.attempts[state.current];
  let fieldIndex = 0;
  for (const row of task.rows) {
    const div = document.createElement('div');
    div.className = 'answer-row';
    if (!row.some(part => typeof part === 'object')) div.classList.add('text-row');
    if (task.number === 4 && (row[0] === 't − 64 = 21')) div.classList.add('section-gap');
    for (const part of row) {
      if (typeof part === 'string') {
        const span = document.createElement('span');
        span.textContent = part;
        if (!/[а-яё]/i.test(part)) span.className = 'math';
        div.append(span);
      } else {
        const input = document.createElement('input');
        input.className = 'answer-field';
        input.type = 'text';
        input.inputMode = 'numeric';
        input.pattern = '[0-9]*';
        input.maxLength = 6;
        input.spellcheck = false;
        input.name = `answer-${fieldIndex}`;
        input.setAttribute('aria-label', part.label);
        input.value = attempt?.values[fieldIndex] || '';
        div.append(input);
        fieldIndex++;
      }
    }
    form.append(div);
  }
  nextButton.textContent = 'Продолжить';
  nextButton.disabled = !attempt?.checked;
  if (attempt?.checked) showChecked(task, attempt.values);
  if (focusHeading) title.focus();
}

function getInputs() { return [...form.querySelectorAll('input')]; }
function storeDraft() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  state.attempts[state.current] = {values:getInputs().map(input => input.value), checked:false};
  save();
}
function checkIfComplete() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  const inputs = getInputs();
  // Wait for blur: the last answer can contain more than one digit.
  if (inputs.some(input => !validNumber(input.value))) return;
  const values = inputs.map(input => normalize(input.value));
  state.attempts[state.current] = {values, checked:true};
  save();
  showChecked(TASKS[state.current], values);
}
function showChecked(task, values) {
  const checks = evaluate(task, values);
  getInputs().forEach((input, i) => {
    input.value = values[i];
    input.readOnly = true;
    input.setAttribute('aria-invalid', String(!checks[i]));
    input.setAttribute('aria-description', checks[i] ? 'Ответ принят. Изменить нельзя.' : 'Неверный ответ. Изменить нельзя.');
  });
  nextButton.disabled = false;
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
form.addEventListener('focusout', event => {
  if (event.target instanceof HTMLInputElement) checkIfComplete();
});
form.addEventListener('submit', event => event.preventDefault());
nextButton.addEventListener('click', () => {
  if (state.current === TASKS.length) {
    Object.assign(state, emptyState()); save(); render(true); return;
  }
  if (!state.attempts[state.current]?.checked) return;
  state.current++;
  save(); render(true); window.scrollTo({top:0, behavior:'instant'});
});

function renderResults() {
  title.textContent = 'Все задания выполнены!';
  condition.hidden = true;
  document.querySelector('#counter').textContent = 'Математика · 3 класс';
  const {grade, correctTasks, correctFields, totalFields} = completedResult(state);
  const summary = document.createElement('div');
  summary.className = 'result';
  for (const text of [
    `Твоя оценка: ${grade}`,
    `Заданий без ошибок: ${correctTasks} из ${TASKS.length}`,
    `Заданий с ошибками: ${TASKS.length - correctTasks}`,
    `Верных ответов: ${correctFields} из ${totalFields}`
  ]) { const p=document.createElement('p'); p.textContent=text; summary.append(p); }
  const returnLink = document.createElement('a');
  returnLink.href = courseUrl;
  returnLink.className = 'return-to-course';
  returnLink.textContent = 'Вернуться к контрольным работам';
  summary.append(returnLink);
  form.append(summary);
  nextButton.textContent = 'Пройти ещё раз';
  nextButton.disabled = false;
  title.focus();
}

render();
