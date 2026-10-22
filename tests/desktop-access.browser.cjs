const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('dist');
const contentTypes = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer((request,response) => {
  const filename=path.join(root,new URL(request.url,'http://localhost').pathname);
  if(!filename.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(filename,(error,data)=>{response.writeHead(error?404:200,{'Content-Type':contentTypes[path.extname(filename)]||'application/octet-stream'});response.end(error?'Not found':data);});
});
async function main(){
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.TEST_BASE_URL||'http://127.0.0.1:'+server.address().port+'/';
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try{
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
    const visit=route=>page.goto(new URL(route,base).href);
    const account=async()=>{await page.waitForFunction(()=>typeof AccessState!=='undefined'&&AccessState.get()!==null);return page.evaluate(()=>AccessState.get());};
    async function shot(name,width,height,fullPage=false){
      await page.setViewportSize({width,height});
      await page.waitForFunction(()=>!document.querySelector('.paywall-canvas')||Math.abs(Number(getComputedStyle(document.documentElement).getPropertyValue('--paywall-scale'))-Math.min(innerWidth/1920,innerHeight/920))<.0001);
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(image=>image.decode()));});
      assert.equal(await page.locator('img').evaluateAll(images=>images.filter(image=>!image.complete||!image.naturalWidth).length),0,name+' missing images');
      const distorted=await page.locator('.figma-type').evaluateAll(images=>images.filter(image=>{const rectangle=image.getBoundingClientRect();return Math.abs(rectangle.width/image.naturalWidth-1)>.015||Math.abs(rectangle.height/image.naturalHeight-1)>.015;}).map(image=>({alt:image.alt,width:image.getBoundingClientRect().width,natural:image.naturalWidth})));
      assert.deepEqual(distorted,[],name+' distorts original Figma label geometry');
      await page.screenshot({path:'/tmp/uchi-desktop-'+name+'.png',fullPage});
    }
    await visit('course.html?subject=math&work=2');await page.locator('.variant-card[href]').waitFor();assert.equal((await account()).balance,20);
    await page.locator('.variant-card[href]').click();await page.locator('#exercise').waitFor({state:'visible'});assert.equal((await account()).balance,5);
    await page.locator('input').first().fill('0');await page.waitForFunction(()=>AccessState.get().attempt.progress.attempts[0]?.values[0]==='0');
    await page.reload();await page.locator('#exercise').waitFor({state:'visible'});assert.equal(await page.locator('input').first().inputValue(),'0');assert.equal((await account()).balance,5);
    await page.locator('#back-to-course').click();await page.locator('#attempt-actions a').click();await page.waitForURL('**#captcha');
    await page.locator('#captcha-answer').waitFor();await page.frameLocator('iframe').locator('.card-preview img').first().waitFor();await shot('captcha',1215,715);
    assert.equal(await page.locator('.paywall-canvas').count(),0);
    await page.locator('#captcha-answer').fill('0');await page.getByRole('button',{name:'Проверить ответ'}).click();await page.getByText('Неверный ответ. Попробуйте ещё раз.').waitFor();
    assert.equal((await account()).entitlement,null);
    await page.reload();await page.locator('#captcha-answer').waitFor();assert.equal((await account()).balance,5);
    await page.locator('#captcha-answer').fill('8');await page.getByRole('button',{name:'Проверить ответ'}).click();await page.waitForURL('**#parent');
    await page.locator('.paywall-canvas').waitFor();await shot('paywall',1920,920);assert.equal(await page.locator('.paywall-benefit').count(),3);
    assert.deepEqual(await page.locator('.paywall-features>div>span>img').evaluateAll(images=>images.map(image=>({width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height}))),[{width:100,height:100},{width:100,height:100}]);
    await page.reload();await page.locator('.paywall-canvas').waitFor();
    await page.getByRole('button',{name:'Купить за 1 500 ₽'}).click();await page.waitForURL('**#plans');await page.locator('.individual-grid').waitFor();
    await shot('tariffs',1280,800,true);assert.equal(await page.locator('.package-card').count(),2);assert.equal(await page.locator('.individual-course').count(),6);
    assert.equal(await page.locator('.figma-cart').count(),0);
    await page.getByRole('button',{name:'Контрольные работы',exact:true}).click();await page.waitForURL('**#details');await page.locator('.course-details').waitFor();await shot('details',1280,800);
    await page.keyboard.press('Escape');await page.waitForURL('**#plans');
    const emptyCartUrl=new URL(page.url());emptyCartUrl.hash='checkout';await page.goto(emptyCartUrl.href);await page.waitForURL('**#plans');assert.equal(await page.locator('.figma-cart').count(),0);
    await visit('access.html#checkout');await page.waitForURL('**#captcha');
    await page.goBack();await page.waitForURL('**#plans');await page.locator('.individual-grid').waitFor();
    await page.getByRole('button',{name:'Добавить курс Контрольные работы',exact:true}).click();await page.locator('.figma-cart').waitFor();await shot('selected',1280,800);
    assert.equal(await page.locator('[data-select-control]').getAttribute('aria-pressed'),'true');
    await page.reload();await page.locator('.figma-cart').waitFor();assert.equal(await page.locator('[data-select-control]').getAttribute('aria-pressed'),'true');
    await page.locator('.figma-cart').getByRole('button',{name:'Купить',exact:true}).click();await page.waitForURL('**#checkout');await page.locator('#payment-form').waitFor();await shot('checkout',1280,800);
    assert.equal(await page.getByLabel('Номер карты, демонстрационное поле').count(),1);
    await page.getByRole('button',{name:'К выбору тарифа'}).click();await page.waitForURL('**#plans');await page.locator('.figma-cart').waitFor();
    await page.goBack();await page.waitForURL('**#checkout');await page.locator('#demo-purchase').waitFor();
    const failedUrl=new URL(page.url());failedUrl.searchParams.set('demoPayment','fail');await page.goto(failedUrl.href);await page.locator('#demo-purchase').click();await page.getByText('Не удалось завершить демо-покупку.',{exact:false}).waitFor();assert.equal((await account()).entitlement,null);
    failedUrl.searchParams.delete('demoPayment');await page.goto(failedUrl.href);await page.locator('#demo-purchase').dblclick();await page.locator('#exercise').waitFor({state:'visible'});
    assert.ok((await account()).entitlement>Date.now());assert.equal((await account()).balance,5);assert.equal(await page.locator('input').first().inputValue(),'');
    for(let index=0;index<11;index++){
      const values=await page.evaluate(index=>expected(TASKS[index]).map(item=>String(item.answer)),index);
      if(index===0)values[0]='0';
      if(index===8)await page.locator('.picture-choice[data-value="3"]').click();
      else{const inputs=page.locator('#answers input,#answers select');for(let fieldIndex=0;fieldIndex<values.length;fieldIndex++){const input=inputs.nth(fieldIndex);if(await input.evaluate(element=>element.tagName==='SELECT'))await input.selectOption(values[fieldIndex]);else await input.fill(values[fieldIndex]);}}
      await page.getByRole('button',{name:'Готово',exact:true}).click();await page.getByRole('button',{name:'Далее',exact:true}).waitFor();
      if(index===0){assert.equal(await page.locator('input').first().getAttribute('aria-invalid'),'true');await page.reload();await page.getByRole('button',{name:'Далее',exact:true}).waitFor();}
      await page.getByRole('button',{name:'Далее',exact:true}).click();await page.waitForFunction(index=>AccessState.get().attempt.progress.current===index+1,index);
    }
    await page.getByText('За завершение начислено 2 яйца',{exact:true}).waitFor();assert.equal((await account()).eggs,2);assert.equal((await account()).balance,5);
    await page.reload();await page.locator('.result').waitFor();assert.equal((await account()).eggs,2);
    await visit('course.html?subject=math&work=2');await page.getByLabel('Оценка 4',{exact:true}).waitFor();await shot('course-grade-4',1215,715);
    assert.equal(await page.locator('.grade-badge').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(255, 136, 17)');
    assert.equal(await page.locator('.variant-card.is-complete .card-status').innerText(),'Пройдено');
    const previewCounts={math:2,russian:2,world:2,reading:4};
    for(const [subject,count] of Object.entries(previewCounts)){
      await page.locator('#tab-'+subject).click();assert.equal(await page.locator('.card-preview img').count(),count);
      assert.equal(await page.locator('.card-preview img').first().getAttribute('src'),'assets/figma-desktop/preview-'+subject+'-3-1.svg');
      await shot('course-'+subject,1215,715);
    }
    await visit('index.html');await page.locator('.result').waitFor();
    await page.getByRole('button',{name:'Пройти ещё раз'}).click();await page.locator('#answers input').first().waitFor();assert.equal((await account()).eggs,2);assert.equal((await account()).balance,5);
    await visit('demo.html');await page.locator('#demo-balance').waitFor();await page.getByRole('button',{name:'Сбросить демо-состояние'}).click();await page.getByText('Состояние сброшено',{exact:false}).waitFor();assert.equal((await account()).balance,20);assert.equal((await account()).eggs,0);assert.equal((await account()).entitlement,null);
    const second=await context.newPage();await Promise.all([page.goto(new URL('index.html',base).href),second.goto(new URL('index.html',base).href)]);await Promise.all([page.locator('#exercise').waitFor({state:'visible'}),second.locator('#exercise').waitFor({state:'visible'})]);
    assert.equal((await account()).balance,5);assert.equal((await account()).attempt.id,await second.evaluate(()=>AccessState.get().attempt.id));await second.close();
    for(const balance of [0,5,14,15]){await page.evaluate(balance=>AccessState.reset(balance),balance);await visit('index.html');if(balance<15)await page.waitForURL('**#captcha');else await page.locator('#exercise').waitFor({state:'visible'});assert.equal((await account()).balance,balance<15?balance:0);}
    await page.evaluate(()=>AccessState.reset(5));await visit('access.html#checkout');await page.waitForURL('**#captcha');
    await visit('access.html#parent');await page.waitForURL('**#captcha');await page.keyboard.press('Escape');await page.waitForURL('**/course.html?subject=math&work=2');
    for(const [grade,correctTasks] of [[2,0],[3,6],[4,9],[5,11]]){
      await page.evaluate(async correctTasks=>{
        await AccessState.reset(20);const account=await AccessState.start(null,null);const progress=emptyState();progress.current=TASKS.length;
        progress.attempts=TASKS.map((task,index)=>({checked:true,values:expected(task).map(item=>String(item.answer))}));
        for(let index=correctTasks;index<TASKS.length;index++){const item=expected(TASKS[index])[0];progress.attempts[index].values[0]=item.options?item.options.find(option=>option!==String(item.answer)):'0';}
        await AccessState.save(account.attempt.id,account.attempt.revision,progress);
      },correctTasks);
      await page.reload();const label=grade===2?'Попробуй ещё раз':'Оценка '+grade;await page.getByLabel(label,{exact:true}).waitFor();
      assert.equal(await page.locator('.variant-card.is-complete').getAttribute('data-grade'),String(grade));
      assert.equal(await page.locator('.grade-badge').evaluate(element=>getComputedStyle(element).backgroundColor),grade===2?'rgb(255, 97, 112)':grade===5?'rgb(16, 200, 78)':'rgb(255, 136, 17)');
      await shot('course-grade-'+grade,1215,715);assert.equal((await account()).eggs,2);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: CAPTCHA before paywall, complete desktop purchase path, four subjects with original Figma previews, grades 2–5, reference screenshots, refresh/back, demo purchase, 11 math tasks, reward once, reset, concurrent tabs and balance edges.');
    await context.close();
  }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
