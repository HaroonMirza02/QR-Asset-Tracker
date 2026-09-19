const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const lines=fs.readFileSync('../deliverables/scan-links.txt','utf8').split('\n');
  const valid=lines[0].replace('Valid demo: ','').trim();
  const invalid=lines[1].replace('Invalid demo: ','').trim();
  await page.goto(valid);await page.getByRole('heading',{name:'Dell Latitude 5540',exact:true}).waitFor();
  await page.screenshot({path:'../deliverables/scan-mobile-browser.png',fullPage:true});
  await page.goto(invalid);await page.getByRole('heading',{name:'QR code not recognized'}).waitFor();
  await page.screenshot({path:'../deliverables/invalid-mobile-browser.png',fullPage:true});
  await page.route('**/api/public/scan/**',r=>r.abort());
  await page.goto(valid);await page.getByRole('heading',{name:'Unable to load this asset'}).waitFor();
  await page.unroute('**/api/public/scan/**');await page.getByRole('button',{name:'Try again'}).click();
  await page.getByRole('heading',{name:'Dell Latitude 5540',exact:true}).waitFor();
  await page.goto('http://localhost:5173/login');
  await page.getByLabel('Email address').fill('admin@meridian-ops.example');await page.getByLabel('Password',{exact:true}).fill('Admin1234!');
  await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/assets');
  const token=await page.evaluate(()=>localStorage.getItem('qr_auth_token'));
  const assets=await page.request.get('http://localhost:5173/api/assets?search=AST0001',{headers:{Authorization:`Bearer ${token}`}});
  const asset=(await assets.json()).data[0];
  await page.goto('http://localhost:5173/assets/'+asset.id);
  await page.getByRole('heading',{name:'Dell Latitude 5540',exact:true}).waitFor();
  const buttons=await page.getByRole('button').allTextContents();console.log('Detail buttons',buttons.join(' | '));
  if(errors.length)throw Error(errors.join('\n'));
  console.log('PASS: mobile viewport valid scan, invalid scan, offline state, retry recovery, login, asset detail, no JS exceptions. Browser emulation only; not physical phone evidence.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
