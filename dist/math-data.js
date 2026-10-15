'use strict';

const field = (answer, label) => ({answer, label});
const INPUT_TASKS = [
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

// Keep source input numbers for continuity; the full sequence uses screen numbers.
const selectField = (answer, label, options) => ({answer, label, options});
const planOptions = [
  'Найти время полёта.',
  'Найти экономию времени.'
];
const comparison = {source:'3775:15708', kind:'dropdown', title:'Сравни.', rows:[
  ['3 см 4 мм', selectField('=', 'Знак между 3 см 4 мм и 34 мм', ['>', '<', '=']), '34 мм'],
  ['7 м 5 дм', selectField('<', 'Знак между 7 м 5 дм и 80 дм', ['>', '<', '=']), '80 дм'],
  ['1 км 200 м', selectField('>', 'Знак между 1 км 200 м и 1150 м', ['>', '<', '=']), '1150 м']
]};
const plan = {source:'3775:15693', kind:'dropdown', title:'Составь план решения.',
  condition:INPUT_TASKS[5].condition, rows:[
  ['1)', selectField(planOptions[0], 'Первый пункт плана', planOptions)],
  ['2)', selectField(planOptions[1], 'Второй пункт плана', planOptions)]
]};
const rectangles = {source:'3775:15681', kind:'pictures', title:'Найди прямоугольник со сторонами 70 мм и 3 см.',
  condition:'1 см равен 2 клеткам.', rows:[], answer:'3', choices:[
    {value:'1', x:424, y:382}, {value:'2', x:858, y:382},
    {value:'3', x:1290, y:382}, {value:'4', x:424, y:900}
  ]};
const TASKS = [...INPUT_TASKS.slice(0,5), comparison, plan, INPUT_TASKS[5], rectangles, ...INPUT_TASKS.slice(6)]
  .map((task,i)=>({...task, kind:task.kind || 'input', inputNumber:task.number, number:i+1}));
const STORAGE_KEY = 'uchi-math-inputs-v1';
function expected(task) {
  return task.kind === 'pictures' ? [{answer:task.answer, label:'Прямоугольник', options:task.choices.map(c=>c.value)}] : task.rows.flat().filter(part => typeof part === 'object');
}
function normalize(value) { return String(value).trim().replace(/\s+/g, '').replace(',', '.'); }
function validNumber(value) { return /^\d+$/.test(normalize(value)); }
function validValue(item, value) { return item.options ? item.options.includes(value) : validNumber(value); }
function evaluate(task, values) {
  return expected(task).map((item,i)=>validValue(item,values[i]) && (item.options ? values[i] === item.answer : Number(normalize(values[i])) === item.answer));
}
function emptyState() { return {version:2, current:0, attempts:Array(TASKS.length).fill(null)}; }
function migrateState(saved) {
  if (saved?.version !== 1) return saved;
  if (!Array.isArray(saved.attempts) || saved.attempts.length !== 8 || !Number.isInteger(saved.current) || saved.current < 0 || saved.current > 8) return null;
  const mapping = [0,1,2,3,4,7,9,10];
  const result = emptyState();
  mapping.forEach((index,i)=>{result.attempts[index]=saved.attempts[i];});
  const missing=result.attempts.findIndex(attempt=>!attempt?.checked);
  const oldCurrent=saved.current===8 ? 11 : mapping[saved.current];
  result.current=Math.min(oldCurrent, missing===-1 ? 11 : missing);
  return result;
}
function loadState() {
  try {
    const saved = migrateState(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    if (!saved || saved.version !== 2 || !Number.isInteger(saved.current) || saved.current < 0 || saved.current > TASKS.length || !Array.isArray(saved.attempts) || saved.attempts.length !== TASKS.length) return emptyState();
    for (let i=0; i<TASKS.length; i++) {
      const attempt = saved.attempts[i];
      if (attempt !== null && (!Array.isArray(attempt.values) || attempt.values.length !== expected(TASKS[i]).length || attempt.values.some(v=>typeof v !== 'string') || typeof attempt.checked !== 'boolean')) return emptyState();
      if (attempt?.checked && attempt.values.some((v,j)=>!validValue(expected(TASKS[i])[j],v))) return emptyState();
      if (i < saved.current && !attempt?.checked) return emptyState();
    }
    return saved;
  } catch { return emptyState(); }
}
function completedResult(saved) {
  if (saved.current !== TASKS.length || saved.attempts.some(attempt=>!attempt?.checked)) return null;
  const checks = TASKS.map((task,i)=>evaluate(task,saved.attempts[i].values));
  const correctTasks = checks.filter(items=>items.every(Boolean)).length;
  const correctFields = checks.flat().filter(Boolean).length;
  // Preserve the prior scale as a fraction of fully correct screens.
  const ratio=correctTasks/TASKS.length;
  const grade=ratio===1 ? 5 : ratio>=0.75 ? 4 : ratio>=0.5 ? 3 : 2;
  return {grade,correctTasks,correctFields,totalFields:checks.flat().length};
}
