'use strict';

// Numbers and source nodes follow the annotations in «Математика 3 кл».
// The repeated exercise in № 3 is intentional: it is present in the source.
const field = (answer, label) => ({answer, label});
const TASKS = [
  {number:1, source:'3775:15723', title:'Вычисли.', rows:[
    ['8 · 2 =',field(16,'8 умножить на 2')],
    ['21 : 3 =',field(7,'21 разделить на 3')],
    ['42 + (40 − 18) =',field(64,'42 плюс разность 40 и 18')],
    ['4 · 5 − 12 + 39 =',field(47,'4 умножить на 5 минус 12 плюс 39')]
  ]},
  {number:2, source:'3775:15720', title:'Вычисли.', rows:[
    ['(100 − 28) : 8 =',field(9,'Разность 100 и 28 разделить на 8')],
    ['36 : 6 · 8 =',field(48,'36 разделить на 6 умножить на 8')],
    ['7 · 9 + 37 =',field(100,'7 умножить на 9 плюс 37')]
  ]},
  {number:3, source:'3775:15717', title:'Вычисли.', rows:[
    ['8 · 2 =',field(16,'8 умножить на 2')],
    ['21 : 3 =',field(7,'21 разделить на 3')],
    ['42 + (40 − 18) =',field(64,'42 плюс разность 40 и 18')],
    ['4 · 5 − 12 + 39 =',field(47,'4 умножить на 5 минус 12 плюс 39')]
  ]},
  {number:4, source:'3775:15714', title:'Реши уравнения. Выполни проверку.', rows:[
    ['37 + y = 70'],['y =',field(33,'Значение y')],['Проверка:'],
    ['37 +',field(33,'Проверка первого уравнения: слагаемое'),'=',field(70,'Проверка первого уравнения: сумма')],
    ['t − 64 = 21'],['t =',field(85,'Значение t')],['Проверка:'],
    [field(85,'Проверка второго уравнения: уменьшаемое'),'− 64 =',field(21,'Проверка второго уравнения: разность')]
  ]},
  {number:5, source:'3775:15711', title:'Вставь числа так, чтобы получились верные равенства.', rows:[
    [field(3,'Неизвестный множитель при умножении на 5'),'· 5 = 15'],
    ['20 :',field(4,'Неизвестный делитель числа 20'),'= 5'],
    ['6 ·',field(1,'Неизвестный множитель при умножении на 6'),'= 6'],
    [field(30,'Неизвестное делимое при делении на 6'),': 6 = 5']
  ]},
  {number:6, source:'3848:5347', title:'Запиши решение и ответ.',
    condition:'От Москвы до Краснодара поезд идёт 24 часа, а самолёт летит в 6 раз быстрее. Сколько часов экономит самолёт для пассажира?', rows:[
    ['1)',field(24,'Первое действие: делимое'),':',field(6,'Первое действие: делитель'),'=',field(4,'Время полёта'),'(ч.)'],
    ['2)',field(24,'Второе действие: уменьшаемое'),'−',field(4,'Второе действие: вычитаемое'),'=',field(20,'Сэкономленное время'),'(ч.)'],
    ['Ответ:',field(20,'Ответ: сколько часов экономит самолёт'),'часов экономит самолёт для пассажира.']
  ]},
  {number:7, source:'3775:15680', title:'Определи периметр и площадь этого прямоугольника.',
    condition:'Стороны прямоугольника — 70 мм и 3 см.', rows:[
    ['Ответ: S =',field(21,'Площадь прямоугольника в квадратных сантиметрах'),'см², P =',field(20,'Периметр прямоугольника в сантиметрах'),'см.']
  ]},
  {number:8, source:'3775:15689', title:'Прочитай и реши задачу.',
    condition:'Ба загадала число и охарактеризовала его так: двузначное, чётное, количество единиц в 2 раза больше количества десятков, но если увеличить на 41, то получится двузначное нечётное, где равны количество десятков и количество единиц.', rows:[
    ['Запиши число, которое загадала Ба.'],[field(36,'Число, которое загадала Ба')]
  ]}
];

const STORAGE_KEY = 'uchi-math-inputs-v1';
const state = loadState();
const form = document.querySelector('#answers');
const nextButton = document.querySelector('#continue');
const title = document.querySelector('#title');
const condition = document.querySelector('#condition');
const feedback = document.querySelector('#feedback');
const progress = document.querySelector('.progress');
const fill = document.querySelector('.progress-fill');

function expected(task) { return task.rows.flat().filter(part => typeof part === 'object'); }
function normalize(value) { return String(value).trim().replace(/\s+/g, '').replace(',', '.'); }
function validNumber(value) { return /^\d+$/.test(normalize(value)); }
function evaluate(task, values) { return expected(task).map((item, i) => validNumber(values[i]) && Number(normalize(values[i])) === item.answer); }
function emptyState() { return {version:1, current:0, attempts:Array(8).fill(null)}; }

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1 || !Number.isInteger(saved.current) || saved.current < 0 || saved.current > 8 || !Array.isArray(saved.attempts) || saved.attempts.length !== 8) return emptyState();
    for (let i=0; i<8; i++) {
      const attempt = saved.attempts[i];
      if (attempt !== null && (!Array.isArray(attempt.values) || attempt.values.length !== expected(TASKS[i]).length || attempt.values.some(v => typeof v !== 'string') || typeof attempt.checked !== 'boolean')) return emptyState();
      if (attempt?.checked && attempt.values.some(v => !validNumber(v))) return emptyState();
      if (i < saved.current && !attempt?.checked) return emptyState();
    }
    return saved;
  } catch { return emptyState(); }
}
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
  const checks = TASKS.map((task, i) => evaluate(task, state.attempts[i].values));
  const correctTasks = checks.filter(items => items.every(Boolean)).length;
  const correctFields = checks.flat().filter(Boolean).length;
  const totalFields = checks.flat().length;
  const summary = document.createElement('div');
  summary.className = 'result';
  for (const text of [
    `Заданий без ошибок: ${correctTasks} из ${TASKS.length}`,
    `Заданий с ошибками: ${TASKS.length - correctTasks}`,
    `Верных ответов: ${correctFields} из ${totalFields}`
  ]) { const p=document.createElement('p'); p.textContent=text; summary.append(p); }
  form.append(summary);
  nextButton.textContent = 'Пройти ещё раз';
  nextButton.disabled = false;
  title.focus();
}

render();
