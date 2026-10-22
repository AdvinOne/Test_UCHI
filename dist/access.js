'use strict';

const content = document.querySelector('#access-content');
const params = new URLSearchParams(location.search);
const course = 'course.html?subject=math&work=2';
let account;
let busy = false;
let captcha;
const intent = params.get('start') || 'resume';
const confirmationKey = `uchi-parent-demo:${intent}`;
const returnUrl = `index.html?${params.toString()}`;
const asset = name => `assets/paywall/${name}.svg`;
const imageTag = (name, className = '') => `<img src="${asset(name)}" alt="" class="${className}">`;
const button = (text, step, className = 'access-button') => `<button type="button" class="${className}" data-step="${step}">${text}</button>`;
const back = step => button('‹ Назад', step, 'access-back');
function confirmation() {
  try { const saved=JSON.parse(sessionStorage.getItem(confirmationKey));return saved?.until>Date.now()?saved:null; } catch { return null; }
}
function navigate(step) { location.hash = step; }
function render() {
  if (!account) return;
  let step = location.hash.slice(1) || 'child';
  if (!['child','parent','captcha','plans','checkout','success'].includes(step)) step='child';
  if (['plans','checkout'].includes(step) && !confirmation()) { location.replace(`${location.pathname}${location.search}#captcha`);return; }
  if (step==='success' && !account.purchase) { navigate('parent');return; }
  document.body.className=`access-page step-${step}`;
  const available = AccessState.fullAccess(account);
  const reason = `На балансе ${account.balance} бусин. Для новой попытки нужно 15.`;
  if (step==='child') {
    content.innerHTML=`<section class="quiet-card child-card"><span class="eyebrow">Контрольные работы</span><div class="child-illustration">${imageTag('format')}${imageTag('assessment')}</div><h1>Для новой попытки<br>нужен взрослый</h1><p>${reason}</p><p>Позови родителя: вместе вы сможете посмотреть, как открыть доступ. Можно вернуться к этому позже.</p><div class="button-stack">${button('Взрослый рядом','parent')}<a class="secondary-link" href="${course}">Вернуться к контрольным</a>${account.attempt?'<a class="secondary-link" href="index.html">'+(completedResult(account.attempt.progress)?'Посмотреть мой результат':'Продолжить начатую попытку бесплатно')+'</a>':''}</div><p class="small-print">Ответы и заработанные яйца сохранены.</p></section>`;
  } else if (step==='parent') {
    content.innerHTML=`<button class="access-back paywall-back" data-step="child" aria-label="Назад">${imageTag('back')}</button><div class="paywall-layout" data-node-id="4186:30896"><section class="offer-panel"><span class="eyebrow">Информация для родителей</span><h1 class="paywall-logo"><span class="visually-hidden">Контрольные работы</span>${imageTag('logo')}</h1><p class="offer-subtitle">Курс-тренажёр к контрольным<br>для 2–4 классов</p><div class="offer-features"><div>${imageTag('format')}<span>Реальный формат<br>контрольных</span></div><div>${imageTag('assessment')}<span>Проверка и оценка<br>сразу</span></div></div><p class="offer-reason">${reason}<br>Годовой доступ позволяет начинать работы без списания бусин.</p><div class="offer-price">1 500 ₽ <span>/ год</span></div>${button(available?'Доступ уже открыт':'Посмотреть условия','captcha','access-button orange-button')}<p class="offer-caption">Один курс «Контрольные работы» · 1 год</p><p class="offer-demo">Демо по макету. Сейчас доступна одна работа по математике за 3 класс. Реальных платежей нет.</p></section><section class="benefits"><h2>Ребёнок сможет</h2>${benefit('Потренироваться как в школе','Выполнить задания в формате школьной контрольной.','practice')}${benefit('Оценить себя','Сразу после решения увидеть оценку и понять уровень знаний.','grade')}${benefit('Найти ошибки','Увидеть выделенные неверные ответы после проверки.','errors')}<a class="paywall-later" href="${course}">Вернуться к контрольным — решение можно принять позже</a></section></div>`;
  } else if (step==='captcha') {
    const first=12+Math.floor(Math.random()*18); const second=21+Math.floor(Math.random()*18);captcha=first+second;
    content.innerHTML=`${back('parent')}<section class="quiet-card"><span class="eyebrow">Шаг 1 из 3 · Для взрослого</span><h1>Подтвердите, что вы взрослый</h1><p>Пожалуйста, решите пример, чтобы перейти к выбору доступа.</p><form id="parent-form"><label class="captcha-label" for="captcha-answer">${first} + ${second} = ?</label><input id="captcha-answer" name="answer" type="text" inputmode="numeric" autocomplete="off" maxlength="3" required aria-describedby="captcha-error"><label class="checkbox-row"><input type="checkbox" name="adult" required>Я родитель или другой взрослый</label><p id="captcha-error" class="form-error" role="alert"></p><button class="access-button" type="submit">К выбору доступа</button></form><p class="small-print">Демо-проверка при передаче устройства взрослому. Она не подтверждает личность или возраст.</p><a class="secondary-link" href="${course}">Вернуться к контрольным</a></section>`;
  } else if (step==='plans') {
    content.innerHTML=`${back('captcha')}<section class="plans-page"><span class="eyebrow">Шаг 2 из 3 · Демо-тарифы</span><h1>Выберите доступ</h1><p class="lead">Для этой покупки выбран курс «Контрольные работы».</p><div class="package-grid"><article class="package-card"><span class="small-print">Пакет из макета</span><h2>Только школа</h2><p>Школьные предметы</p><p class="small-print">Не подключён в прототипе. Стоимость и условия здесь не предлагаются.</p><button disabled class="access-button">Недоступно в демо</button></article><article class="package-card"><span class="small-print">Пакет из макета</span><h2>Всё на Учи.ру</h2><p>Школьные и развивающие курсы</p><p class="small-print">Не подключён в прототипе. Стоимость и условия здесь не предлагаются.</p><button disabled class="access-button">Недоступно в демо</button></article></div><h2>Один курс</h2><div class="period-options" aria-label="Срок доступа"><button disabled>Месяц · нет в демо</button><button disabled>Полгода · нет в демо</button><button aria-pressed="true">Год</button></div><article class="selected-course" data-node-id="3911:18100">${imageTag('course-icon')}<div><h2>Контрольные работы</h2><p>1 год · новые попытки без бусин</p></div><div class="plan-price"><strong>1 500 ₽ / год</strong><span>125 ₽/мес в пересчёте</span></div><span class="selected-check" aria-label="Выбрано">✓</span></article><p class="small-print">Сумма за год — 1 500 ₽, а не ежемесячный платёж. Цена взята из paywall-макета. В демо открывается только готовая контрольная по математике за 3 класс; остальные предметы и варианты пока недоступны. Это не действующая оферта Учи.ру.</p><footer class="cart-bar"><span>Выбран 1 курс · 1 год</span><strong>1 500 ₽</strong>${button('К демо-оформлению','checkout','access-button coral-button')}</footer></section>`;
  } else if (step==='checkout') {
    content.innerHTML=`${back('plans')}<section class="checkout-page"><span class="eyebrow">Шаг 3 из 3</span><h1>Демо-оформление</h1><div class="checkout-grid"><div class="payment-demo"><h2>Без реального платежа</h2><p>Банковская карта, СБП и платёжный сервис не подключены. Вводить реквизиты не нужно.</p><label class="checkbox-row"><input id="demo-consent" type="checkbox">Понимаю, что это демонстрация покупки</label><p id="purchase-error" class="form-error" role="alert"></p><button class="access-button coral-button" id="demo-purchase" disabled>Открыть демо-доступ</button><button class="text-button" id="demo-failure">Проверить неуспешную покупку</button></div><aside class="order-summary"><h2>Ваш демо-заказ</h2><div class="order-course">${imageTag('course-icon')}<p>Контрольные работы<br><span>Доступ на 1 год</span></p></div><hr><p>Стоимость по макету <strong>1 500 ₽</strong></p><p>К реальному списанию <strong>0 ₽</strong></p><p class="small-print">Демо-доступ сохраняется только в этом браузере. Новые попытки не расходуют бусины. Автоплатежей в демо нет.</p></aside></div></section>`;
  } else {
    content.innerHTML=`<section class="quiet-card success-card">${imageTag('assessment','success-icon')}<span class="eyebrow">Демонстрация завершена</span><h1>Демо-доступ открыт!</h1><p>Контрольные работы доступны на год в этом браузере. Реальные деньги не списывались.</p><p>Можно вернуться к математике. Баланс — ${account.balance} бусин, яйца — ${account.eggs}. Новые попытки не расходуют бусины.</p><a href="${returnUrl}" class="access-button">Вернуться к контрольной</a><a href="${course}" class="secondary-link">К списку контрольных</a></section>`;
  }
  if (['plans','checkout'].includes(step)) {
    const brand=document.createElement('div');brand.className='access-brand';brand.innerHTML=imageTag('uchi-logo');brand.querySelector('img').alt='Учи.ру';content.prepend(brand);
  }
  content.focus(); window.scrollTo(0,0);
}
function benefit(title, description, illustration) {
  let art;
  if (illustration==='grade') {
    art=`<div class="grade-book">${imageTag('grade-book')}</div><div class="grade-bubble">${imageTag('grade-bubble')}</div><div class="grade-vectors">${[1,2,3,4,5,6].map(index=>imageTag(`grade-v${index}`,`grade-v${index}`)).join('')}</div><div class="grade-ground">${imageTag('grade-ground')}</div>`;
  } else art=imageTag(illustration,`${illustration}-illustration`);
  return `<article class="benefit-card"><div class="benefit-copy">${imageTag('checkmark','benefit-check')}<div><h3>${title}</h3><p>${description}</p></div></div><div class="feature-art" aria-hidden="true"><div class="art-canvas">${art}</div></div></article>`;
}
content.addEventListener('click',async event=>{
  const step=event.target.closest('[data-step]')?.dataset.step;
  if (step) { navigate(step);return; }
  if (event.target.id==='demo-failure') {
    document.querySelector('#purchase-error').textContent='Демо: покупка не завершена. Деньги и бусины не списаны, доступ не изменился. Можно попробовать снова.';
  }
  if (event.target.id!=='demo-purchase' || busy) return;
  if (!confirmation()) { navigate('captcha');return; }
  if (!document.querySelector('#demo-consent').checked) return;
  busy=true;event.target.disabled=true;
  try { account=await AccessState.buy(confirmation().order);navigate('success'); }
  catch(error){document.querySelector('#purchase-error').textContent=error.message;event.target.disabled=false;}
  finally {busy=false;}
});
content.addEventListener('change',event=>{if(event.target.id==='demo-consent')document.querySelector('#demo-purchase').disabled=!event.target.checked;});
content.addEventListener('submit',event=>{
  if (event.target.id!=='parent-form') return;
  event.preventDefault();
  const form=event.target;
  if (Number(form.elements.answer.value)!==captcha || !form.elements.adult.checked) {
    document.querySelector('#captcha-error').textContent='Пока не получилось. Проверьте ответ и подтвердите, что вы взрослый.';
    form.elements.answer.setAttribute('aria-invalid','true');form.elements.answer.focus();return;
  }
  try {sessionStorage.setItem(confirmationKey,JSON.stringify({until:Date.now()+15*60*1000,order:crypto.randomUUID()}));navigate('plans');}
  catch {document.querySelector('#captcha-error').textContent='Разрешите сохранение данных в браузере для продолжения.';}
});
window.addEventListener('hashchange',render);
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
AccessState.open().then(value=>{account=value;render();}).catch(error=>{
  content.textContent=error.message;const link=document.createElement('a');link.href='demo.html';link.textContent='Настройки демо';content.append(document.createElement('br'),link);
});
