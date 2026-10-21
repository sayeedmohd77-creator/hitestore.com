'use strict';
// Integration tests use a temporary, disposable directory and fake identities only.
const os=require('node:os'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const net=require('node:net');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getPort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port))});s.on('error',reject)})}
(async()=>{
 const port=await getPort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'hitestore-v3-'));
 let child,customerCookie='',adminCookie='',customerToken='',adminToken='';const base=`http://127.0.0.1:${port}`;
 const start=()=>{child=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),HITESTORE_DATA_DIR:dir,HITESTORE_ADMIN_PASSWORD:'Strong-Local-Test-Password-Only'}});child.stderr.on('data',d=>process.stderr.write(d))};
 const request=async(endpoint,{method='GET',body,cookie='',csrf}={})=>{
  const h={...(cookie?{'Cookie':cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})};const r=await fetch(base+endpoint,{method,headers:h,...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json().catch(()=>({})),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 const expect=(v,msg)=>{assert.ok(v,msg);console.log('PASS '+msg)};
 try{
  start();let ready=false;for(let i=0;i<50;i++){try{const r=await request('/api/health');if(r.status===200){ready=true;break}}catch{}await sleep(100)}expect(ready,'V3 API starts on loopback');
  expect((await fetch(base+'/server.js')).status===404,'Server source is not exposed');
  expect((await fetch(base+'/backend/dev-commerce.js')).status===404,'Backend source is not exposed');
  expect((await fetch(base+'/runtime/demo-store.json')).status===404,'User storage is not exposed');
  const unauth=await request('/api/orders');expect(unauth.status===401,'Private orders require login');
  const registered=await request('/api/register',{method:'POST',body:{name:'Demo Tester',email:'tester@example.invalid',password:'not-a-real-password-123'}});
  expect(registered.status===201,'Demo customer registration');customerCookie=registered.cookie;customerToken=registered.data.csrf;
  const duplicate=await request('/api/register',{method:'POST',body:{name:'Demo Tester',email:'tester@example.invalid',password:'not-a-real-password-123'}});expect(duplicate.status===409,'Duplicate account blocked');
  const invalidCSRF=await request('/api/orders',{method:'POST',cookie:customerCookie,body:{items:[]}});expect(invalidCSRF.status===403,'Mutations require CSRF token');
  const seed={items:[{id:'p02',size:'M',qty:1}],paymentMethod:'COD',coupon:'WELCOME10',delivery:{name:'Demo Recipient',phone:'9999999999',line1:'Test Building Sample Street',line2:'',city:'Hyderabad',state:'Telangana',pin:'500001'}};
  const invalidAddress=await request('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...seed,delivery:{...seed.delivery,pin:'000001'}}});expect(invalidAddress.status===400,'Invalid PIN format rejected');
  const shortAddress=await request('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...seed,delivery:{...seed.delivery,line1:'hyd'}}});expect(shortAddress.status===400&&/Address line 1 needs at least 8 characters/.test(shortAddress.data.error),'Short address rejected with field-specific error');
  const shortPhone=await request('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...seed,delivery:{...seed.delivery,phone:'123'}}});expect(shortPhone.status===400&&/mobile number with exactly 10 digits/.test(shortPhone.data.error),'Invalid mobile rejected with field-specific error');
  const manipulated=await request('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...seed,total:1,items:[{id:'p02',size:'M',qty:1,price:1}]}});expect(manipulated.status===201,'Server creates COD order independently of client price');
  const o=manipulated.data.order;expect(o.subtotal===1899&&o.discount===190&&o.shipping===99&&o.total===1808,'Correct server-calculated subtotal, discount, shipping and total');
  expect(o.paymentStatus==='PENDING_COLLECTION_DEMO','COD payment pending in server');
  const list=await request('/api/orders',{cookie:customerCookie});expect(list.status===200&&list.data.orders.length===1,'Customer sees own server-backed orders');
  const denied=await request('/api/admin/orders',{cookie:customerCookie});expect(denied.status===401,'Customer cannot access admin orders');
  const badAdmin=await request('/api/admin/login',{method:'POST',body:{password:'bad-password'}});expect(badAdmin.status===401,'Invalid staff password blocked');
  const admin=await request('/api/admin/login',{method:'POST',body:{password:'Strong-Local-Test-Password-Only'}});expect(admin.status===200,'Admin login from environment password');adminCookie=admin.cookie;adminToken=admin.data.csrf;
  const admList=await request('/api/admin/orders',{cookie:adminCookie});expect(admList.status===200&&admList.data.orders.length===1,'Staff sees local test orders');
  const wrongFlow=await request('/api/admin/orders/'+o.id+'/status',{method:'POST',cookie:adminCookie,csrf:adminToken,body:{status:'DELIVERED_DEMO'}});expect(wrongFlow.status===409,'Invalid order status transition blocked');
  const collected=await request('/api/admin/orders/'+o.id+'/payment',{method:'POST',cookie:adminCookie,csrf:adminToken,body:{status:'COLLECTED_DEMO'}});expect(collected.status===200&&collected.data.order.paymentStatus==='COLLECTED_DEMO','Admin marks test COD payment as collected');
  const packed=await request('/api/admin/orders/'+o.id+'/status',{method:'POST',cookie:adminCookie,csrf:adminToken,body:{status:'PACKED_DEMO'}});expect(packed.status===200,'Admin marks order packed (test)');
  const cancelled=await request('/api/admin/orders/'+o.id+'/status',{method:'POST',cookie:adminCookie,csrf:adminToken,body:{status:'CANCELLED_DEMO'}});expect(cancelled.status===200,'Admin cancels test order');
  const noSecondCancel=await request('/api/admin/orders/'+o.id+'/status',{method:'POST',cookie:adminCookie,csrf:adminToken,body:{status:'CANCELLED_DEMO'}});expect(noSecondCancel.status===409,'Repeat cancellation blocked');
  const orderAgain=await request('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:seed});expect(orderAgain.status===201,'Cancelled order restocked item');
  const invalidSecret=await request('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...seed,paymentMethod:'ONLINE'}});expect(invalidSecret.status===400,'Unsupported online payment rejected');
  child.kill();await new Promise(resolve=>child.once('exit',resolve));start();ready=false;for(let i=0;i<50;i++){try{const r=await request('/api/health');if(r.status===200){ready=true;break}}catch{}await sleep(100)}expect(ready,'Server restarts cleanly');
  const beforeLogin=await request('/api/orders',{cookie:customerCookie});expect(beforeLogin.status===401,'In-memory sessions expire on restart');
  const login=await request('/api/login',{method:'POST',body:{email:'tester@example.invalid',password:'not-a-real-password-123'}});expect(login.status===200,'Customer can log in after restart');
  const afterLogin=await request('/api/orders',{cookie:login.cookie});expect(afterLogin.status===200&&afterLogin.data.orders.length===2,'Orders persist after server restart');
  const crossSite=await fetch(base+'/api/session',{headers:{Origin:'https://fake.example'}});expect(crossSite.status===403,'Cross-origin requests are blocked');
  console.log('All V3 local API tests passed.');
 }finally{if(child&&child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve))}fs.rmSync(dir,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
