'use strict';
// HiteStore V3: loopback-only DEVELOPMENT backend. File-backed JSON data is not a production database.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const dataDir = path.resolve(process.env.HITESTORE_DATA_DIR || path.join(root, 'runtime'));
const storePath = path.join(dataDir, 'demo-store.json');
const COOKIE = 'hitestore_dev_session';
const sessions = new Map();
const throttle = new Map();
const TTL = 8 * 60 * 60 * 1000;
const MAX_BODY = 20 * 1024;
const context = {window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js','data.js'),'utf8'),context, {timeout:1000});
const seed = JSON.parse(JSON.stringify(context.window.HITESTORE_SEED));
const initial = () => ({schema:1,accounts:[],orders:[],stock:Object.fromEntries(seed.map(p=>[p.id,p.stock]))});
fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
let db;
try {db = JSON.parse(fs.readFileSync(storePath,'utf8')); if(db.schema!==1||!Array.isArray(db.accounts)||!Array.isArray(db.orders)||!db.stock)throw Error('Invalid schema');}
catch(e){if(e.code==='ENOENT')db=initial();else throw Error('Development store cannot be loaded: '+e.message)}
function persist(){const temp=storePath+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(temp,storePath);}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const fail=(res,status,message)=>json(res,status,{error:message});
const random=()=>crypto.randomBytes(32).toString('hex');
const hashPassword=pw=>{const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(pw,salt,64).toString('hex');};
const verify=(pw,hash)=>{try{const [salt,key]=hash.split(':');const a=Buffer.from(key,'hex');const b=crypto.scryptSync(pw,salt,64);return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}};
const clean=(v,max=120)=> typeof v==='string'?v.trim().slice(0,max):'';
function cookies(req){const c=(req.headers.cookie||'').split(';').map(v=>v.trim());return c.find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||''}
function getSession(req){const token=cookies(req),s=sessions.get(token);if(!s)return null;if(s.expires<Date.now()){sessions.delete(token);return null}return s;}
function openSession(res,accountId,role){const token=random(),csrf=random();sessions.set(token,{accountId,role,csrf,expires:Date.now()+TTL});res.setHeader('Set-Cookie',`${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${TTL/1000}`);return csrf;}
function closeSession(req,res){sessions.delete(cookies(req));res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0`)}
function sessionData(session){if(!session)return {authenticated:false};if(session.role==='admin')return {authenticated:true,role:'admin',csrf:session.csrf};const user=db.accounts.find(x=>x.id===session.accountId);return user?{authenticated:true,role:'customer',name:user.name,email:user.email,csrf:session.csrf}:{authenticated:false}}
function throttleOK(req,key){const id=(req.socket.remoteAddress||'local')+':'+key,now=Date.now();let item=throttle.get(id);if(!item||now-item.start>15*60*1000){item={start:now,count:0};throttle.set(id,item)}item.count++;return item.count<=12}
function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{const u=new URL(origin);const host=req.headers.host;return u.host===host&&(u.hostname==='localhost'||u.hostname==='127.0.0.1')}catch{return false}}
async function readBody(req,maxBody=MAX_BODY){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>maxBody){const err=Error('Payload too large');err.status=413;throw err}chunks.push(chunk)}let v;try{v=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{const err=Error('Invalid JSON');err.status=400;throw err}if(!v||typeof v!=='object'||Array.isArray(v))throw Object.assign(Error('Expected JSON object'),{status:400});return v}
function auth(req,res,role){const s=getSession(req);if(!s||s.role!==role){fail(res,401,'Sign in required');return null}return s}
function csrf(req,res,s){if(!s||req.headers['x-csrf-token']!==s.csrf){fail(res,403,'Invalid session security token');return false}return true}
function publicOrder(o){return {returnRequest:o.returnRequest||null,id:o.id,created:o.created,items:o.items,total:o.total,subtotal:o.subtotal,discount:o.discount,shipping:o.shipping,status:o.status,paymentMethod:'COD',paymentStatus:o.paymentStatus,delivery:o.delivery}}
const v4=require('./v4')({db,persist,seed,auth,csrf,readBody,json,fail,clean,root,dataDir});
function handleAPI(req,res){return (async()=>{
  if(!sameOrigin(req))return fail(res,403,'Cross-site request blocked');
  const method=req.method,url=new URL(req.url,'http://localhost');const p=url.pathname;
  if(p.startsWith('/api/v4/'))return v4.handle(req,res,p,method,url);
  if(method==='GET'&&p==='/api/health')return json(res,200,{ok:true,mode:'LOCAL_DEVELOPMENT_ONLY',version:4});
  if(method==='GET'&&p==='/api/session')return json(res,200,sessionData(getSession(req)));
  if(method==='POST'&&p==='/api/register'){
    if(!throttleOK(req,'register'))return fail(res,429,'Try again later');
    const b=await readBody(req),name=clean(b.name,70),email=clean(b.email,130).toLowerCase(),password=b.password;
    if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>130||typeof password!=='string'||password.length<10||password.length>128)return fail(res,400,'Valid name, email and password (10–128 characters) required');
    if(db.accounts.some(a=>a.email===email))return fail(res,409,'This demo email is already registered');
    const account={id:crypto.randomUUID(),name,email,passwordHash:hashPassword(password),created:new Date().toISOString()};db.accounts.push(account);persist();
    const token=openSession(res,account.id,'customer');return json(res,201,{authenticated:true,role:'customer',name,email,csrf:token});
  }
  if(method==='POST'&&p==='/api/login'){
    if(!throttleOK(req,'login'))return fail(res,429,'Try again later');
    const b=await readBody(req),email=clean(b.email,130).toLowerCase(),password=b.password;
    if(typeof password!=='string')return fail(res,401,'Invalid credentials');
    const account=db.accounts.find(a=>a.email===email);
    if(!account||!verify(password,account.passwordHash))return fail(res,401,'Invalid credentials');
    const csrfToken=openSession(res,account.id,'customer');return json(res,200,{authenticated:true,role:'customer',name:account.name,email,csrf:csrfToken});
  }
  if(method==='POST'&&p==='/api/admin/login'){
    if(!throttleOK(req,'admin'))return fail(res,429,'Try again later');
    if(!process.env.HITESTORE_ADMIN_PASSWORD||process.env.HITESTORE_ADMIN_PASSWORD.length<12)return fail(res,503,'Admin login not configured. Set a local 12+ character password.');
    const b=await readBody(req);if(typeof b.password!=='string'||b.password.length>128)return fail(res,401,'Invalid admin credentials');
    const stored=crypto.createHash('sha256').update(process.env.HITESTORE_ADMIN_PASSWORD).digest(),provided=crypto.createHash('sha256').update(b.password).digest();
    if(!crypto.timingSafeEqual(stored,provided))return fail(res,401,'Invalid admin credentials');
    const csrfToken=openSession(res,'local-admin','admin');return json(res,200,{authenticated:true,role:'admin',csrf:csrfToken});
  }
  if(method==='POST'&&p==='/api/logout'){const session=getSession(req);if(!session)return fail(res,401,'Not signed in');if(!csrf(req,res,session))return;closeSession(req,res);return json(res,200,{ok:true})}
  if(method==='GET'&&p==='/api/orders'){
    const s=auth(req,res,'customer');if(!s)return;return json(res,200,{orders:db.orders.filter(o=>o.customerId===s.accountId).map(publicOrder)});
  }
  if(method==='POST'&&p==='/api/orders'){
    const s=auth(req,res,'customer');if(!s||!csrf(req,res,s))return;
    const b=await readBody(req),delivery=b.delivery||{},items=b.items;
    if(!Array.isArray(items)||!items.length||items.length>30)return fail(res,400,'Cart must contain 1–30 lines');
    const d={name:clean(delivery.name,80),phone:clean(delivery.phone,16),line1:clean(delivery.line1,160),line2:clean(delivery.line2,160),city:clean(delivery.city,80),state:clean(delivery.state,80),pin:clean(delivery.pin,20)};
    if(d.name.length<2)return fail(res,400,'Recipient name must contain at least 2 characters.');
    if(!/^\d{10}$/.test(d.phone))return fail(res,400,'Enter an Indian mobile number with exactly 10 digits.');
    if(d.line1.length<8)return fail(res,400,'Address line 1 needs at least 8 characters (include building and street).');
    if(d.city.length<2)return fail(res,400,'City must contain at least 2 characters.');
    if(d.state.length<2)return fail(res,400,'State must contain at least 2 characters.');
    if(!/^[1-9]\d{5}$/.test(d.pin))return fail(res,400,'Enter a valid six-digit Indian PIN code (the first digit cannot be 0).');
    if(b.paymentMethod!=='COD')return fail(res,400,'Only simulated COD orders are supported');
    let subtotal=0;const quantities={},aggregate={},orderItems=[];
    for(const item of items){const id=clean(item.id,40),size=clean(item.size,20),qty=item.qty;const prod=v4.product(id);
      if(!prod||!prod.sizes.includes(size)||!Number.isInteger(qty)||qty<1||qty>10)return fail(res,400,'Invalid product, size or quantity. Custom browser products are not supported by V3 yet.');
      const key=id+'|'+size;quantities[key]=(quantities[key]||0)+qty;aggregate[id]=(aggregate[id]||0)+qty;if(quantities[key]>v4.available(id,size)||(!v4.tracksSizes(id)&&aggregate[id]>v4.totalStock(id)))return fail(res,409,'Insufficient stock for '+prod.name+' ('+size+')');
      subtotal+=prod.price*qty;orderItems.push({id,size,qty,name:prod.name,price:prod.price});
    }
    if(subtotal>250000)return fail(res,400,'Local demo order amount exceeds safety limit');
    if(!v4.served(d.pin))return fail(res,422,'This PIN is outside the configured DEMO delivery-zone prefixes. Not a real courier check.');
    const discount=clean(b.coupon,20).toUpperCase()==='WELCOME10'?Math.round(subtotal*0.1):0,shipping=v4.shipping(subtotal);
    const order={id:'HT-LOCAL-'+crypto.randomBytes(5).toString('hex').toUpperCase(),customerId:s.accountId,created:new Date().toISOString(),items:orderItems,subtotal,discount,shipping,total:subtotal-discount+shipping,delivery:d,status:'PLACED_DEMO',paymentMethod:'COD',paymentStatus:'PENDING_COLLECTION_DEMO'};
    for(const item of orderItems)v4.take(item.id,item.size,item.qty);
    db.orders.unshift(order);persist();return json(res,201,{order:publicOrder(order),note:'TEST ORDER ONLY. No actual courier, payment or fulfilment.'});
  }
  if(method==='GET'&&p==='/api/admin/orders'){
    const s=auth(req,res,'admin');if(!s)return;return json(res,200,{orders:db.orders.map(o=>({...publicOrder(o),customerEmail:db.accounts.find(a=>a.id===o.customerId)?.email||''}))});
  }
  const change=p.match(/^\/api\/admin\/orders\/(HT-LOCAL-[A-F0-9]{10})\/(status|payment)$/);
  if(method==='POST'&&change){const s=auth(req,res,'admin');if(!s||!csrf(req,res,s))return;const b=await readBody(req),o=db.orders.find(x=>x.id===change[1]);if(!o)return fail(res,404,'Order not found');
    if(change[2]==='payment'){
      if(b.status!=='COLLECTED_DEMO'||o.status==='CANCELLED_DEMO')return fail(res,400,'Payment transition not allowed');o.paymentStatus='COLLECTED_DEMO';
    }else{
      if(!['PACKED_DEMO','SHIPPED_DEMO','DELIVERED_DEMO','CANCELLED_DEMO'].includes(b.status))return fail(res,400,'Invalid status');
      const transitions={PLACED_DEMO:['PACKED_DEMO','CANCELLED_DEMO'],PACKED_DEMO:['SHIPPED_DEMO','CANCELLED_DEMO'],SHIPPED_DEMO:['DELIVERED_DEMO'],DELIVERED_DEMO:[],CANCELLED_DEMO:[]};
      if(!transitions[o.status].includes(b.status))return fail(res,409,'Status transition not allowed');
      if(b.status==='CANCELLED_DEMO'){for(const item of o.items)v4.restore(item.id,item.size,item.qty)}
      o.status=b.status;
    }
    persist();return json(res,200,{order:publicOrder(o)});
  }
  return fail(res,404,'API route not found');
})().catch(e=>fail(res,e.status||500,e.status?e.message:'Local server error'));}
module.exports={handleAPI};
