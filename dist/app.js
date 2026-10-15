'use strict';

// Full math sequence follows the left-to-right order of the Figma section.
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
  form.dataset.kind = task.kind;
  progress.setAttribute('aria-valuemax', String(TASKS.length));
  const attempt = state.attempts[state.current];
  let fieldIndex = 0;
  for (const row of task.rows) {
    const …140 tokens truncated…= document.createElement(part.options ? 'select' : 'input');
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
  nextButton.textContent = 'Продолжить';
  nextButton.disabled = !attempt?.checked;
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
      commitAnswers([choice.value]);
    });
  }
  form.append(grid);
}
function getInputs() { return [...form.querySelectorAll('input,select')]; }
function commitAnswers(values) {
  state.attempts[state.current]={values,checked:true}; save(); showChecked(TASKS[state.current],values);
}
function storeDraft() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  state.attempts[state.current] = {values:getInputs().map(input => input.value), checked:false};
  save();
}
function checkIfComplete() {
  if (state.current >= TASKS.length || state.attempts[state.current]?.checked) return;
  const inputs = getInputs();
  // Wait for blur: the last answer can contain more than one digit.
  const task=TASKS[state.current];
  if (task.kind==='pictures' || inputs.some((input,i)=>!validValue(expected(task)[i],input.value))) return;
  const values=inputs.map(input=>input instanceof HTMLSelectElement ? input.value : normalize(input.value));
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
form.addEventListener('change', event=>{
  if (!(event.target instanceof HTMLSelectElement)) return;
  if (state.attempts[state.current]?.checked) return;
  storeDraft(); checkIfComplete();
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
