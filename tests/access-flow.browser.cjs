const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('dist');
const contentTypes = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((request,response) => {
  const filename=path.join(root,new URL(request.url,'http://localhost').pathname);
  if (!filename.startsWith(root+path.sep)) {response.writeHead(403).end();return;}
  fs.readFile(filename,(error,data)=>{response.writeHead(error?404:200,{'Content-Type':contentTypes[path.extname(filename)] || 'application/octet-stream'});response.end(error?'Not found':data);});
});
async function main() {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.TEST_BASE_URL || `http://127.0.0.1:${server.address().port}/`;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const context=await browser.newContext();const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const visit=route=>page.goto(new URL(route,base).href);
    const account=async()=>{await page.waitForFunction(()=>typeof AccessState!=='undefined' && AccessState.get()!==null);return page.evaluate(()=>AccessState.get());};
    async function course() {await visit('course.html?subject=math&work=2');await page.waitForFunction(()=>typeof AccessState!=='undefined' && AccessState.get()?.balance>=0);}
    await course();assert.equal((await account()).balance,20);
    await page.locator('.variant-card[href]').click();await page.locator('#exercise').waitFor({state:'visible'});
    assert.equal((await account()).balance,5);
    await page.locator('input').first().fill('0');
    await page.waitForFunction(()=>AccessState.get().attempt.progress.attempts[0]?.values[0]==='0');
    await page.reload();await page.locator('#exercise').waitFor({state:'visible'});
    assert.equal(await page.locator('input').first().inputValue(),'0');assert.equal((await account()).balance,5);
    await page.locator('#back-to-course').click();await page.locator('#attempt-actions a').waitFor();
    await page.locator('#attempt-actions a').click();await page.waitForURL('**#child');
    assert.equal((await account()).balance,5);assert.equal((await account()).attempt.progress.attempts[0].values[0],'0');
    await page.getByRole('button',{name:'Взрослый рядом'}).click();await page.waitForURL('**#parent');
    await page.screenshot({path:process.env.SCREENSHOT_DIR?path.join(process.env.SCREENSHOT_DIR,'paywall-desktop.png'):'/tmp/uchi-paywall-desktop.png',fullPage:true});
    assert.equal(await page.locator('img').evaluateAll(images=>images.filter(img=>!img.complete || !img.naturalWidth).length),0);
    await page.getByRole('button',{name:'Посмотреть условия'}).click();await page.waitForURL('**#captcha');
    await page.locator('#captcha-answer').fill('0');await page.locator('[name=adult]').check();await page.getByRole('button',{name:'К выбору доступа'}).click();
    await page.getByText('Пока не получилось.',{exact:false}).waitFor();
    const numbers=(await page.locator('.captcha-label').textContent()).match(/\d+/g).map(Number);
    await page.locator('#captcha-answer').fill(String(numbers[0]+numbers[1]));await page.getByRole('button',{name:'К выбору доступа'}).click();
    await page.waitForURL('**#plans');await page.reload();await page.locator('.selected-course').waitFor();
    await page.getByRole('button',{name:'К демо-оформлению'}).click();await page.waitForURL('**#checkout');
    await page.locator('#demo-failure').click();await page.getByText('Демо: покупка не завершена.',{exact:false}).waitFor();assert.equal((await account()).entitlement,null);
    await page.locator('#demo-consent').check();await page.locator('#demo-purchase').dblclick();await page.waitForURL('**#success');
    assert.equal((await account()).balance,5);const expires=(await account()).entitlement;
    await page.reload();await page.locator('.success-card').waitFor();assert.equal((await account()).entitlement,expires);
    await page.getByRole('link',{name:'Вернуться к контрольной',exact:true}).click();await page.locator('#exercise').waitFor({state:'visible'});
    assert.equal((await account()).balance,5);assert.equal(await page.locator('input').first().inputValue(),'');
    for (let index=0;index<11;index++) {
      const values=await page.evaluate(index=>expected(TASKS[index]).map(item=>String(item.answer)),index);
      if(index===0)values[0]='0';
      if(index===8)await page.locator('.picture-choice[data-value="3"]').click();
      else {
        const inputs=page.locator('#answers input,#answers select');
        for(let fieldIndex=0;fieldIndex<values.length;fieldIndex++) {
          const input=inputs.nth(fieldIndex);
          if(await input.evaluate(element=>element.tagName==='SELECT'))await input.selectOption(values[fieldIndex]);
          else await input.fill(values[fieldIndex]);
        }
      }
      await page.getByRole('button',{name:'Готово',exact:true}).click();
      await page.getByRole('button',{name:'Далее',exact:true}).waitFor();
      if(index===0) {assert.equal(await page.locator('input').first().getAttribute('aria-invalid'),'true');await page.reload();await page.getByRole('button',{name:'Далее',exact:true}).waitFor();}
      await page.getByRole('button',{name:'Далее',exact:true}).click();
      await page.waitForFunction(index=>AccessState.get().attempt.progress.current===index+1,index);
    }
    await page.getByText('За завершение начислено 2 яйца',{exact:true}).waitFor();
    assert.equal((await account()).eggs,2);assert.equal((await account()).balance,5);
    await page.reload();await page.locator('.result').waitFor();assert.equal((await account()).eggs,2);
    await page.getByRole('button',{name:'Пройти ещё раз',exact:true}).click();await page.locator('#answers input').first().waitFor();assert.equal((await account()).eggs,2);assert.equal((await account()).balance,5);
    await visit('demo.html');await page.locator('#demo-balance').waitFor();
    page.on('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Сбросить демо-состояние'}).click();await page.getByText('Состояние сброшено',{exact:false}).waitFor();
    assert.equal((await account()).balance,20);assert.equal((await account()).eggs,0);assert.equal((await account()).entitlement,null);
    await course();const second=await context.newPage();await Promise.all([second.goto(new URL('index.html',base).href),page.goto(new URL('index.html',base).href)]);
    await Promise.all([page.locator('#exercise').waitFor({state:'visible'}),second.locator('#exercise').waitFor({state:'visible'})]);
    const firstId=(await account()).attempt.id;
    assert.equal(await second.evaluate(()=>AccessState.get().attempt.id),firstId);assert.equal((await account()).balance,5);
    await second.close();
    for (const balance of [0,5,14,15]) {
      await page.evaluate(async balance=>{await AccessState.reset(balance);},balance);
      await visit('index.html');
      if(balance<15)await page.waitForURL('**#child');else await page.locator('#exercise').waitFor({state:'visible'});
      assert.equal((await account()).balance,balance<15?balance:0);
    }
    await page.evaluate(async()=>{await AccessState.reset(5);});
    await visit('access.html#checkout');await page.waitForURL('**#captcha');
    await page.setViewportSize({width:390,height:844});await visit('access.html#parent');await page.locator('.paywall-layout').waitFor();
    await page.screenshot({path:'/tmp/uchi-paywall-mobile.png',fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.setViewportSize({width:360,height:800});await page.screenshot({path:'/tmp/uchi-paywall-mobile-360.png',fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS: full math flow, wrong answer, persistence, debit once, restart paywall, captcha error/success, tariff refresh, failed/success demo purchase, reward once, reset, concurrent tabs, balance edges, route guard, mobile 390/360.');
    await context.close();
  } finally {await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
