'use strict';

const statusLine=document.querySelector('#demo-status');
function showAccount(account) {statusLine.textContent=`Бусины: ${account.balance} · Яйца: ${account.eggs} · Демо-доступ: ${AccessState.fullAccess(account)?'открыт':'закрыт'}`;}
const ready=AccessState.open().then(showAccount).catch(error=>{statusLine.textContent=error.message;});
document.querySelector('#reset-form').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!confirm('Сбросить ответы, баланс, яйца и демо-покупку? Это действие нельзя отменить.'))return;
  const button=event.target.querySelector('button');button.disabled=true;
  try {
    await ready;
    const account=await AccessState.reset(Number(document.querySelector('#demo-balance').value));
    Object.keys(sessionStorage).filter(key=>key.startsWith('uchi-parent-demo:')).forEach(key=>sessionStorage.removeItem(key));
    showAccount(account);statusLine.textContent+=' · Состояние сброшено';
  } catch(error){statusLine.textContent=error.message || 'Не удалось сбросить состояние. Обнови страницу.';}
  finally{button.disabled=false;}
});
