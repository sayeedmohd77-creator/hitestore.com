'use strict';
// V4 tests use an isolated disposable folder and synthetic data only.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise((resolve,reject)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});s.on('error',reject)});
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hitestore-v4-test-')),port=await freePort(),base=`http://127.0.0.1:${port}`;
 let child,customerCookie='',adminCookie='',customerToken='',adminToken='';
 function start(){child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),HITESTORE_DATA_DIR:dir,HITESTORE_ADMIN_PASSWORD:'Strong-Local-Test-Admin-Password'}});child.stderr.on('data',d=>process.stderr.write(d))}
 async function stop(){if(child&&child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve))}}
 const req=async(endpoint,{method='GET',body,cookie,csrf}={})=>{const h={...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})};const r=await fetch(base+endpoint,{method,headers:h,...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json().catch(()=>({})),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 const ok=(expr,label)=>{assert.ok(expr,label);console.log('PASS V4:',label)};
 const waitReady=async()=>{for(let i=0;i<50;i++){try{if((await req('/api/health')).status===200)return}catch{}await pause(100)}throw Error('Server did not start')};
 try{
  start();await waitReady();
  const health=await req('/api/health');ok(health.data.version===4,'Version 4 local API starts');
  const publicCatalog=await req('/api/v4/catalog');ok(publicCatalog.status===200&&publicCatalog.data.products.length===16,'Existing products remain in server catalogue');
  const guestDenied=await req('/api/v4/admin/catalog');ok(guestDenied.status===401,'Unauthenticated users cannot manage catalogue');
  const publicShipping=await req('/api/v4/shipping?pin=500001');ok(publicShipping.status===200&&publicShipping.data.eligible&&publicShipping.data.demoOnly,'Sample PIN rules distinctly labelled as demo');
  const notServed=await req('/api/v4/shipping?pin=123001');ok(notServed.status===200&&!notServed.data.eligible,'Unsupported sample PIN prefix rejected by rule');
  const customer=await req('/api/register',{method:'POST',body:{name:'V4 Test User',email:'v4@test.invalid',password:'invented-test-password-123'}});ok(customer.status===201,'Customer registered');customerCookie=customer.cookie;customerToken=customer.data.csrf;
  const staff=await req('/api/admin/login',{method:'POST',body:{password:'Strong-Local-Test-Admin-Password'}});ok(staff.status===200,'Admin logged in');adminCookie=staff.cookie;adminToken=staff.data.csrf;
  const admin={cookie:adminCookie,csrf:adminToken};
  const badProduct=await req('/api/v4/admin/products',{method:'POST',...admin,body:{name:'Tiny',sku:'A',sizes:['S'],sizeStock:{S:1},price:100,mrp:200}});ok(badProduct.status===400,'Invalid product master rejected');
  const productInput={name:'Sample Weekend Shirt',brand:'HiteStore Demo',sku:'HT-V4-TEST-01',category:'Men',price:699,mrp:999,sizes:['S','M'],sizeStock:{S:2,M:1},description:'Sample local photo shirt'};
  const made=await req('/api/v4/admin/products',{method:'POST',...admin,body:productInput});ok(made.status===201&&made.data.product.id.startsWith('srv-'),'Server-backed product and size stock created');
  const pid=made.data.product.id;
  const duplicate=await req('/api/v4/admin/products',{method:'POST',...admin,body:productInput});ok(duplicate.status===409,'Duplicate SKU blocked');
  const edited=await req('/api/v4/admin/products/'+pid,{method:'PUT',...admin,body:{name:'Sample Weekend Shirt Edited',brand:'HiteStore Demo',category:'Men',price:649,mrp:999,description:'Updated demo product'}});ok(edited.status===200&&edited.data.product.price===649,'Staff can edit server-managed product details');
  const wrongPhoto=await req('/api/v4/admin/photos',{method:'POST',...admin,body:{productId:pid,image:'data:image/png;base64,'+Buffer.from('not an image').toString('base64')}});ok(wrongPhoto.status===400,'Malformed photo bytes rejected');
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==';
  const photo=await req('/api/v4/admin/photos',{method:'POST',...admin,body:{productId:pid,image:'data:image/png;base64,'+png}});ok(photo.status===200&&/^\/product-images\/[a-f0-9-]+\.png$/.test(photo.data.imagePath),'Admin uploads local photo');
  const imageGet=await fetch(base+photo.data.imagePath);ok(imageGet.status===200&&imageGet.headers.get('content-type')==='image/png','Local photo serves as image only');
  ok((await fetch(base+'/runtime/product-images/'+photo.data.imagePath.split('/').at(-1))).status===404,'Private runtime directory cannot be listed or accessed directly');
  const strictSize=await req('/api/v4/admin/stock/'+pid,{method:'PUT',...admin,body:{sizeStock:{S:2,M:1}}});ok(strictSize.status===200,'Admin updates size-wise stock');
  const seedStock=await req('/api/v4/admin/stock/p02',{method:'PUT',...admin,body:{sizeStock:{XS:2,S:2,M:2,L:2}}});ok(seedStock.status===200&&seedStock.data.product.sizeStock.M===2,'Existing seeded product can switch to size-wise stock');
  const bogusStock=await req('/api/v4/admin/stock/'+pid,{method:'PUT',...admin,body:{sizeStock:{S:-1,M:10}}});ok(bogusStock.status===400,'Negative stock rejected');
  const updatedShipping=await req('/api/v4/admin/shipping',{method:'PUT',...admin,body:{prefixes:['500','560'],flatFee:49,freeThreshold:2000}});ok(updatedShipping.status===200,'Admin demo shipping configuration saved');
  const orderBase={items:[{id:pid,size:'M',qty:1}],paymentMethod:'COD',delivery:{name:'Sample Recipient',phone:'9999999999',line1:'Example Street Building 123',line2:'',city:'Hyderabad',state:'Telangana',pin:'500001'}};
  const sizeSumOver=await req('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...orderBase,items:[{id:'p01',size:'S',qty:10},{id:'p01',size:'M',qty:10},{id:'p01',size:'L',qty:10}]}});ok(sizeSumOver.status===409,'Aggregate legacy stock cannot be oversold across multiple size lines');
  const tooLongPin=await req('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...orderBase,delivery:{...orderBase.delivery,pin:'5000019'}}});ok(tooLongPin.status===400,'Seven-digit PIN rejected instead of silently truncating');
  const wrongZone=await req('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:{...orderBase,delivery:{...orderBase.delivery,pin:'123001'}}});ok(wrongZone.status===422,'Server enforces configured demo zone rules');
  const order=await req('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:orderBase});ok(order.status===201&&order.data.order.subtotal===649&&order.data.order.shipping===49,'Server creates COD order for new product, calculates configured shipping');
  const oid=order.data.order.id;
  const soldOut=await req('/api/orders',{method:'POST',cookie:customerCookie,csrf:customerToken,body:orderBase});ok(soldOut.status===409,'Size-specific stock prevents a second order');
  const earlyReturn=await req('/api/v4/returns/'+oid,{method:'POST',cookie:customerCookie,csrf:customerToken,body:{reason:'Testing fit issue only'}});ok(earlyReturn.status===409,'Returns blocked before demo delivery');
  for(const status of ['PACKED_DEMO','SHIPPED_DEMO','DELIVERED_DEMO']){const r=await req('/api/admin/orders/'+oid+'/status',{method:'POST',...admin,body:{status}});ok(r.status===200,'Test order transition to '+status)}
  const returnRequest=await req('/api/v4/returns/'+oid,{method:'POST',cookie:customerCookie,csrf:customerToken,body:{reason:'Testing fit issue only'}});ok(returnRequest.status===201,'Customer requests local test return');
  const repeated=await req('/api/v4/returns/'+oid,{method:'POST',cookie:customerCookie,csrf:customerToken,body:{reason:'Testing fit issue only'}});ok(repeated.status===409,'Duplicate return request blocked');
  const approve=await req('/api/v4/admin/returns/'+oid,{method:'POST',...admin,body:{status:'APPROVED_DEMO'}});ok(approve.status===200,'Staff approves local return without processing refund');
  const again=await req('/api/v4/admin/returns/'+oid,{method:'POST',...admin,body:{status:'APPROVED_DEMO'}});ok(again.status===409,'Double return approval/restock blocked');
  const restocked=await req('/api/v4/catalog');ok(restocked.data.products.find(x=>x.id===pid).sizeStock.M===1,'Approved return restocks selected size once');
  await stop();start();await waitReady();
  const persisted=await req('/api/v4/catalog');ok(persisted.data.products.find(x=>x.id===pid).name==='Sample Weekend Shirt Edited','Custom products survive server restart');
  const photoStill=await fetch(base+photo.data.imagePath);ok(photoStill.status===200,'Uploaded test photograph survives restart');
  const sh=await req('/api/v4/shipping?pin=110001');ok(!sh.data.eligible,'Demo delivery settings survive restart');
  console.log('All V4 local API tests passed.');
 }finally{await stop();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
