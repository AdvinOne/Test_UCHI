'use strict';

const content = document.querySelector('#access-content');
const params = new URLSearchParams(location.search);
const courseUrl = 'course.html?subject=math&work=1';
const returnUrl = `index.html?${params.toString()}`;
const intent = params.get('start') || 'resume';
const confirmationKey = `uchi-parent-demo-v2:${intent}`;
const selectionKey = `uchi-control-cart:${intent}`;
let account;
let selected = false;
let busy = false;

function confirmed() {
  try {const value=JSON.parse(sessionStorage.getItem(confirmationKey));return value?.until>Date.now()?value:null;}
  catch {return null;}
}
function navigate(step) {location.hash=step;}
function render() {
  if (!account) return;
  let step=location.hash.slice(1) || 'captcha';
  if (step==='child' || !['parent','captcha','plans','details','checkout'].includes(step)) {
    history.replaceState(null,'',`${location.pathname}${location.search}#captcha`);step='captcha';
  }
  if (['parent','plans','details','checkout'].includes(step) && !confirmed()) {location.replace(`${location.pathname}${location.search}#captcha`);return;}
  if (step==='checkout' && !selected) {location.replace(`${location.pathname}${location.search}#plans`);return;}
  document.body.className=`access-page step-${step}`;
  document.title=step==='checkout'?'Демо — Оплата картой':step==='captcha'?'Не хватает бусин — Контрольные работы':step==='parent'?'Контрольные работы':'Выберите идеальный формат обучения';
  content.innerHTML=step==='parent'?DesktopAccess.paywall():step==='captcha'?DesktopAccess.captcha():step==='details'?DesktopAccess.details():step==='checkout'?DesktopAccess.checkout():DesktopAccess.plans(selected);
  applyFigmaTypography(content,step);
  updateScale();
  window.scrollTo(0,step==='plans'&&selected?1559:0);
  content.focus();
  if (step==='captcha') document.querySelector('#captcha-answer').focus({preventScroll:true});
  if (step==='details') document.querySelector('[data-step="plans"]').focus({preventScroll:true});
}
function updateScale() {
  document.documentElement.style.setProperty('--paywall-scale',Math.min(innerWidth/1920,innerHeight/920));
}
function purchaseFailure(message) {
  document.querySelector('#purchase-error').textContent=message;
}
async function purchase() {
  if (busy) return;
  const confirmation=confirmed();
  if (!confirmation) {navigate('captcha');return;}
  if (params.get('demoPayment')==='fail') {
    purchaseFailure('Не удалось завершить демо-покупку. Деньги не списаны, доступ не изменился. Вернитесь к выбору тарифа и попробуйте снова.');return;
  }
  if (!confirm('Это демонстрация покупки. Реальные деньги не списываются, данные карты никуда не отправляются. Открыть демо-доступ к контрольным работам?')) return;
  busy=true;
  const button=document.querySelector('#demo-purchase');button.disabled=true;
  try {
    account=await AccessState.buy(confirmation.order);
    alert('Демо-доступ открыт. Реальные деньги не списывались. Сейчас вернёмся к контрольной работе.');
    location.href=returnUrl;
  } catch(error) {purchaseFailure(error.message);button.disabled=false;}
  finally {busy=false;}
}
content.addEventListener('click',event=>{
  const target=event.target.closest('button,[data-course],[data-step]');
  if (!target) return;
  if (target.hasAttribute('data-course')) {location.href=courseUrl;return;}

  if (target.dataset.step) {navigate(target.dataset.step);return;}
  if (target.hasAttribute('data-select-control')) {
    selected=!selected;
    try {sessionStorage.setItem(selectionKey,String(selected));}
    catch {alert('Разрешите сохранение данных браузером для продолжения.');selected=!selected;return;}
    render();return;
  }
  if (target.hasAttribute('data-purchase-sbp')) {purchase();return;}
  if (target.hasAttribute('data-toggle-cvc')) {
    const input=document.querySelector('[name=cvc]');const visible=input.type==='password';input.type=visible?'text':'password';target.setAttribute('aria-label',visible?'Скрыть CVC':'Показать CVC');return;
  }
  if (target.hasAttribute('data-read-captcha')) {
    if ('speechSynthesis' in window) {const message=new SpeechSynthesisUtterance('Не хватает бусин. Позови родителей, чтобы они открыли доступ. Квадратный корень из шестидесяти четырёх равен?');message.lang='ru-RU';speechSynthesis.speak(message);}return;
  }
  if (target.dataset.period==='2') return;
  if (target.hasAttribute('data-period') || target.hasAttribute('data-other-product')) alert('Этот вариант показан по макету. В прототипе доступен путь покупки курса «Контрольные работы» на год. Реальной оплаты нет.');
});
content.addEventListener('submit',event=>{
  event.preventDefault();
  if (event.target.id==='payment-form') {purchase();return;}
  if (event.target.id!=='parent-form') return;
  const answer=event.target.elements.answer;
  if (answer.value.trim()!=='8') {
    answer.setAttribute('aria-invalid','true');document.querySelector('#captcha-error').textContent='Неверный ответ. Попробуйте ещё раз.';answer.focus();return;
  }
  try {sessionStorage.setItem(confirmationKey,JSON.stringify({until:Date.now()+15*60*1000,order:crypto.randomUUID()}));navigate('parent');}
  catch {document.querySelector('#captcha-error').textContent='Разрешите сохранение данных браузером для продолжения.';}
});
document.addEventListener('keydown',event=>{
  if (event.key==='Escape') {if(location.hash==='#details')navigate('plans');else if(location.hash==='#captcha')location.href=courseUrl;}
});
window.addEventListener('resize',updateScale);
window.addEventListener('hashchange',render);
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
history.scrollRestoration='manual';
AccessState.open().then(value=>{
  account=value;
  try {selected=sessionStorage.getItem(selectionKey)==='true';} catch {}
  render();
}).catch(error=>{
  content.textContent=error.message;
  const link=document.createElement('a');link.href='demo.html';link.textContent='Настройки демо';content.append(document.createElement('br'),link);
});
