'use strict';

const CourseCards = (() => {
  const previews = {
    math: [
      {node:'3957:159265',file:'preview-math-3-1.svg',alt:'8 · 7 = 56'},
      {node:'3957:159272',file:'preview-math-3-2.svg',alt:'3 м = 30 дм'}
    ],
    world: [
      {node:'3957:159304',file:'preview-world-3-1.svg',alt:'Вещества состоят из частиц'},
      {node:'3957:159309',file:'preview-world-3-2.svg',alt:'Воздух — бесцветный'}
    ],
    russian: [
      {node:'3957:159339',file:'preview-russian-3-1.svg',alt:'Солнце выглянуло'},
      {node:'3957:159345',file:'preview-russian-3-2.svg',alt:'Берёзка'}
    ],
    reading: [
      {node:'3957:159376',file:'preview-reading-3-1.svg',alt:'«Сказка о рыбаке и рыбке» — Пушкин'},
      {node:'3957:159381',file:'preview-reading-3-2.svg',alt:'«Вот север, тучи нагоняя...» — Пушкин'},
      {node:'3957:159386',file:'preview-reading-3-3.svg',alt:'«Зайцы» — Толстой'},
      {node:'3957:159391',file:'preview-reading-3-4.svg',alt:'«Акула» — рассказ'}
    ]
  };
  function gradeBadge(grade) {
    if (![2,3,4,5].includes(grade)) return null;
    return {label:grade===2?'Попробуй ещё раз':`Оценка ${grade}`,file:`type-grade-${grade}.svg`,color:grade===2?'#ff6170':grade===5?'#10c84e':'#ff8811'};
  }
  return {previews,gradeBadge};
})();

if (typeof module !== 'undefined') module.exports = CourseCards;
