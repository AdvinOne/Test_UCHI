'use strict';
if(new URLSearchParams(location.search).has('accessBackdrop'))document.documentElement.classList.add('access-backdrop');
const SUBJECTS = [
  {id:'math',name:'Математика',icon:'assets/math-icon.svg',width:90.8617,height:108.363},
  {id:'russian',name:'Русский язык',icon:'assets/russian-icon.svg',width:137,height:137},
  {id:'world',name:'Окружающий мир',icon:'assets/world-icon.png',width:137,height:137},
  {id:'reading',name:'Литературное чтение',icon:'assets/reading-icon.png',width:137,height:137}
];
const WORKS = ['Вводная КР №1 (сентябрь)','КР №2 (октябрь)','КР №3 (декабрь)','КР №4 (март)','КР №5 (май)'];
const params = new URLSearchParams(location.search);
let selectedSubject = SUBJECTS.some(s=>s.id===params.get('subject')) ? params.get('subject') : 'math';
let selectedWork = /^[1-5]$/.test(params.get('work') || '') ? Number(params.get('work')) : 1;
const tabs = document.querySelector('#subject-tabs');
const workList = document.querySelector('#work-list');
const cards = document.querySelector('#variant-grid');
let account;
function updateUrl(){const url=new URL(location.href);url.searchParams.set('subject',selectedSubject);url.searchParams.set('work',selectedWork);history.replaceState(null,'',url);}
function renderCourse(){
  const saved=account?.attempt?.progress || emptyState();
  const result=completedResult(saved);
  const subject=SUBJECTS.find(s=>s.id===selectedSubject);
  document.title=`Контрольные работы — ${subject.name}`;
  tabs.replaceChildren();
  SUBJECTS.forEach((s,index)=>{
    const tab=document.createElement('button');tab.type='button';tab.className='subject-tab';tab.textContent=s.name;tab.id=`tab-${s.id}`;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','subject-panel');tab.setAttribute('aria-selected',String(s.id===selectedSubject));tab.tabIndex=s.id===selectedSubject?0:-1;
    tab.addEventListener('click',()=>{selectedSubject=s.id;updateUrl();renderCourse();document.querySelector(`#tab-${s.id}`).focus();});
    tab.addEventListener('keydown',event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%SUBJECTS.length;else if(event.key==='ArrowLeft')next=(index+SUBJECTS.length-1)%SUBJECTS.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=SUBJECTS.length-1;else return;event.preventDefault();selectedSubject=SUBJECTS[next].id;updateUrl();renderCourse();document.querySelector(`#tab-${selectedSubject}`).focus();});tabs.append(tab);
  });
  document.querySelector('#subject-panel').setAttribute('aria-labelledby',`tab-${selectedSubject}`);
  const subjectIcon=document.querySelector('.subject-illustration img');
  subjectIcon.src=subject.icon;
  subjectIcon.alt=subject.name;
  subjectIcon.setAttribute('width',subject.width);
  subjectIcon.setAttribute('height',subject.height);
  workList.replaceChildren();
  WORKS.forEach((name,index)=>{
    const button=document.createElement('button');button.type='button';button.className=`work-item${index+1===selectedWork?' is-selected':''}`;button.setAttribute('aria-current',index+1===selectedWork?'page':'false');
    const label=document.createElement('span');label.className='work-name';label.textContent=name;
    const status=document.createElement('span');status.className='work-status';status.textContent=index===1&&selectedSubject==='math'?result?'Пройдено':saved.attempts.some(Boolean)?'В процессе':'Не начато':'Не начато';
    button.append(label,status);button.addEventListener('click',()=>{selectedWork=index+1;updateUrl();renderCourse();document.querySelector('.work-item.is-selected').focus();});workList.append(button);
  });
  document.querySelector('#work-title').textContent=WORKS[selectedWork-1];
  cards.replaceChildren();
  CourseCards.previews[selectedSubject].forEach((preview,index)=>{
    const difficulty=['лёгкий','средний','сложный'][index];
    const enabled=selectedSubject==='math'&&selectedWork===2&&index===0;
    const card=document.createElement(enabled&&account?'a':'div');card.className='variant-card';if(enabled&&account){card.href=result?AccessState.restartUrl():'index.html?from=course';card.setAttribute('aria-label',result?'Пройти контрольную ещё раз':account.attempt?'Продолжить контрольную':'Начать контрольную за 15 бусин');}else{card.setAttribute('aria-disabled','true');}
    const asset=document.createElement('span');asset.className='card-preview';asset.dataset.nodeId=preview.node;
    const img=document.createElement('img');img.src='assets/figma-desktop/'+preview.file;img.alt=preview.alt;img.width=266;img.height=200;asset.append(img);
    const copy=document.createElement('span');copy.className='card-copy';
    const label=document.createElement('span');label.className='card-label';label.textContent=`Вариант ${index+1}${difficulty?' ('+difficulty+')':''}`;
    const status=document.createElement('span');status.className='card-status';status.textContent=enabled?(result?'Пройдено':saved.attempts.some(Boolean)?'В процессе':'Не начато'):'Не начато';
    if(enabled&&result){const check=document.createElement('img');check.src='assets/figma-desktop/native-course-complete.svg';check.width=20;check.height=20;check.alt='';status.append(check);}
    copy.append(label,status);card.append(asset,copy);
    if(enabled&&result){
      card.classList.add('is-complete');card.dataset.grade=result.grade;
      const presentation=CourseCards.gradeBadge(result.grade);
      const badge=document.createElement('span');badge.className='grade-badge';badge.setAttribute('aria-label',presentation.label);
      const text=document.createElement('img');text.src='assets/figma-desktop/'+presentation.file;text.alt=presentation.label;badge.append(text);card.append(badge);
    }
    cards.append(card);
  });
  const actions=document.querySelector('#attempt-actions');actions.replaceChildren();
  if (account && selectedSubject==='math' && selectedWork===2 && account.attempt && !result) {
    const link=document.createElement('a');link.href=AccessState.restartUrl();
    link.textContent='Начать новую попытку · 15 бусин';
    if (account.balance>=15 || AccessState.fullAccess(account)) link.addEventListener('click',event=>{if(!confirm('Начать заново? Ответы текущей попытки будут заменены.'))event.preventDefault();});
    actions.append(link);
  }
  if (account) {
    document.querySelector('#balance-summary').textContent=`Бусины: ${account.balance} · Яйца: ${account.eggs}${AccessState.fullAccess(account)?' · Демо-доступ открыт':''}`;
    document.querySelector('#start-note').textContent=AccessState.fullAccess(account)?'Демо-доступ: новые попытки без списания бусин. За завершение — 2 яйца.':account.attempt&&!result?'Продолжить начатую попытку можно без списания. Новая попытка — 15 бусин. За завершение — 2 яйца.':'Новый старт — 15 бусин. За завершение — 2 яйца.';
  }
}
document.querySelector('#toggle-variants').addEventListener('click',event=>{const button=event.currentTarget;const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));button.setAttribute('aria-label',expanded?'Развернуть варианты работ':'Свернуть варианты работ');document.querySelector('#work-variants').hidden=expanded;});
async function refreshAccount(){
  try { account=await AccessState.open();renderCourse(); }
  catch(error){account=null;document.querySelector('#balance-summary').textContent=error.message;renderCourse();}
}
window.addEventListener('pageshow',refreshAccount);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAccount();});
updateUrl();renderCourse();
