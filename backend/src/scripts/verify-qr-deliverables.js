'use strict';
require('../config/environment');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/database');
const app = require('../app');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Asset = require('../models/Asset');
const History = require('../models/AssetHistory');
(async () => {
 await connectDB();
 const server = app.listen(0); await new Promise(r => server.once('listening', r));
 const base = `http://127.0.0.1:${server.address().port}`;
 const email = `qr-check-${Date.now()}@example.test`;
 let tid;
 const post = (route, body, token) => fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 const scan = url => { const u=new URL(url); return fetch(base+'/api/public'+u.pathname+u.search); };
 try {
  const signup=await post('/api/auth/signup',{name:'QR Check',organization:'Disposable QR Check',email,password:'TestPassword1234!'});
  assert.equal(signup.status,201);const {token}= (await signup.json()).data;
  tid=(await User.findOne({email})).tenantId;
  const created=await post('/api/assets',{name:'Verification laptop',category:'Laptop',isPublicVisible:true},token);
  assert.equal(created.status,201);const asset=(await created.json()).data;
  assert.equal((await scan(asset.qrCodeUrl)).status,200);
  const detail=await fetch(base+`/api/assets/${asset.id}?includeQrImage=true`,{headers:{Authorization:`Bearer ${token}`}});
  const png=(await detail.json()).data.qrCodeImageBase64;
  assert.ok(png.startsWith('data:image/png;base64,'));assert.equal(Buffer.from(png.split(',')[1],'base64').subarray(1,4).toString(),'PNG');
  const rotated=await post(`/api/assets/${asset.id}/qr/regenerate`,{},token); assert.equal(rotated.status,200);
  const next=(await rotated.json()).data;assert.notEqual(next.qrCodeUrl,asset.qrCodeUrl);
  assert.equal((await scan(asset.qrCodeUrl)).status,404);assert.equal((await scan(next.qrCodeUrl)).status,200);
  const hidden=await post('/api/assets',{name:'Private test asset',category:'Tool',isPublicVisible:false},token);
  assert.equal((await scan((await hidden.json()).data.qrCodeUrl)).status,404);
  assert.equal((await fetch(base+`/api/public/scan/not-a-token?t=${tid}`)).status,404);
  assert.equal((await fetch(base+`/api/public/scan/${'a'.repeat(64)}?t=${tid}`)).status,404);
  assert.equal((await fetch(base+`/api/public/scan/${'a'.repeat(64)}`)).status,422);
  const demoTenant=await Tenant.findOne({slug:'meridian-ops'});
  assert.equal(await Asset.countDocuments({tenantId:demoTenant._id}),60);
  const sample=await Asset.findOne({tenantId:demoTenant._id,assetCode:'AST0001'});
  const qrService=require('../services/qrService');
  const sampleUrl=qrService.buildScanUrl(sample.qrToken,String(demoTenant._id));
  const samplePng=await qrService.generateQrImage(sampleUrl);
  const output=path.resolve(__dirname,'../../../..','deliverables');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'EZTrack-demo-QR.png'),Buffer.from(samplePng.split(',')[1],'base64'));
  fs.writeFileSync(path.join(output,'scan-links.txt'),`Valid demo: ${sampleUrl}\nInvalid demo: ${process.env.APP_BASE_URL}/scan/not-a-token?t=${demoTenant._id}\nPhone testing requires APP_BASE_URL reachable from the phone. Regenerate this sample after changing the URL or reseeding.\n`);
  console.log('PASS: create + PNG generation; valid public scan; private, malformed, unknown, missing-tenant states; QR rotation invalidates old link; 60 demo assets. Sample QR saved.');
 } finally {
  const user=await User.findOne({email});if(user)tid=user.tenantId;
  if(tid){await Asset.deleteMany({tenantId:tid});await History.deleteMany({tenantId:tid});await User.deleteMany({tenantId:tid});await Tenant.deleteOne({_id:tid});}
  await new Promise(r=>server.close(r));await disconnectDB();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
