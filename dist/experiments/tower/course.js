'use strict';
const SUBJECTS = [
  {id:'math',name:'Математика',icon:'../../assets/math-icon.svg',width:90.8617,height:108.363},
  {id:'russian',name:'Русский язык',icon:'../../assets/russian-icon.svg',width:137,height:137},
  {id:'world',name:'Окружающий мир',icon:'../../assets/world-icon.png',width:137,height:137},
  {id:'reading',name:'Литературное чтение',icon:'../../assets/reading-icon.png',width:137,height:137}
];
const WORKS = ['Вводная КР №1 (сентябрь)','КР №2 (октябрь)','КР №3 (декабрь)','КР №4 (март)','КР №5 (май)'];
const params = new URLSearchParams(location.search);
let selectedSubject = SUBJECTS.some(s=>s.id===params.get('subject')) ? params.get('subject') : 'math';
let selectedWork = /^[1-5]$/.test(params.get('work') || '') ? Number(params.get('work')) : 2;
const tabs = document.querySelector('#subject-tabs');
const workList = document.querySelector('#work-list');
const cards = document.querySelector('#variant-grid');
function updateUrl(){const url=new URL(location.href);url.searchParams.set('subject',selectedSubject);url.searchParams.set('work',selectedWork);history.replaceState(null,'',url);}
function renderCourse(){
  let storage; try { storage=localStorage; } catch { storage={getItem:()=>null}; }
  const experiment=TowerWork.load(storage);
  const saved=experiment.work;
  document.querySelector('#course-city-count').textContent=experiment.buildings.length;
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
  document.querySelector('#course-building-note').hidden=selectedSubject!=='math'||selectedWork!==2;
  cards.replaceChildren();
  ['лёгкий','средний','сложный'].forEach((difficulty,index)=>{
    const enabled=selectedSubject==='math'&&selectedWork===2&&index===0;
    const card=document.createElement(enabled?'a':'div');card.className='variant-card';if(enabled){card.href='index.html?from=course';}else{card.setAttribute('aria-disabled','true');}
    const asset=document.createElement('span');asset.className='card-asset';asset.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src='../../assets/course-shell.png';img.alt='';asset.append(img);
    const number=document.createElement('span');number.className='card-number';number.textContent=index+1;
    const label=document.createElement('span');label.className='card-label';label.textContent=`Вариант ${index+1} (${difficulty})`;
    const status=document.createElement('span');status.className='card-status';status.textContent=enabled?(result?`Пройдено · Оценка: ${result.grade}`:saved.attempts.some(Boolean)?'В процессе':'Не начато'):'Не начато';card.append(asset,number,label,status);
    if(enabled&&result){card.classList.add('is-complete');card.dataset.grade=result.grade;const badge=document.createElement('span');badge.className='grade-badge';badge.textContent=result.grade;badge.setAttribute('aria-label',`Оценка ${result.grade}`);card.append(badge);}
    if(enabled){const note=document.createElement('span');note.className='card-building';note.textContent=result?'Дом построен':saved.attempts.some(Boolean)?`Этажей: ${TowerWork.checks(experiment).length} из ${TASKS.length}`:'Построй свой дом';card.append(note);}
    cards.append(card);
  });
}
document.querySelector('#toggle-variants').addEventListener('click',event=>{const button=event.currentTarget;const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));button.setAttribute('aria-label',expanded?'Развернуть варианты работ':'Свернуть варианты работ');document.querySelector('#work-variants').hidden=expanded;});
document.querySelector('.course-back').addEventListener('click',()=>{selectedSubject='math';selectedWork=2;updateUrl();renderCourse();});
window.addEventListener('pageshow',renderCourse);
window.addEventListener('storage',event=>{if(event.key===TowerWork.KEY)renderCourse();});
updateUrl();renderCourse();
