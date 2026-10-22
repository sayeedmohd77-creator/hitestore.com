'use strict';
// V4 local-only catalogue, size inventory, demo serviceability and returns.
// NOT a production backend. Does not contact a courier, collect funds or issue refunds.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const CATEGORIES=['Women','Men','Kids','Accessories'];
const PREFIXES=['500','110','400','560','600','700']; // Samples, NOT real courier coverage.
const LIMIT=650*1024;
module.exports=function createV4({db,persist,seed,auth,csrf,readBody,json,fail,clean,root,dataDir}){
 db.customProducts??=[];db.variants??={};db.shipping??={prefixes:[...PREFIXES],flatFee:99,freeThreshold:1999};
 const product=id=>[...seed,...db.customProducts].find(x=>x.id===id);
 const totalStock=id=>db.variants[id]?Object.values(db.variants[id]).reduce((a,n)=>a+n,0):(db.stock[id]||0);
 const available=(id,size)=>db.variants[id]?Number(db.variants[id][size]||0):Number(db.stock[id]||0);
 const products=()=>[...seed,...db.customProducts].map(p=>({id:p.id,name:p.name,brand:p.brand,category:p.category,sizes:p.sizes,sku:p.sku||`HT-${p.id.toUpperCase()}`,price:p.price,mrp:p.mrp,type:p.type||'shirt',badge:p.badge||'NEW',rating:p.rating||4.5,reviews:p.reviews||0,colors:p.colors||['Demo'],description:p.description||'',imagePath:p.imagePath||null,stock:totalStock(p.id),sizeStock:db.variants[p.id]||null,editable:p.id.startsWith('srv-')}));
 const served=pin=>/^[1-9]\d{5}$/.test(String(pin))&&db.shipping.prefixes.some(pre=>String(pin).startsWith(pre));
 const shipping=subtotal=>subtotal>=db.shipping.freeThreshold?0:db.shipping.flatFee;
 function take(id,size,qty){if(available(id,size)<qty)return false; if(db.variants[id])db.variants[id][size]-=qty;db.stock[id]=(db.stock[id]||0)-qty;return true;}
 function restore(id,size,qty){if(db.variants[id])db.variants[id][size]=(db.variants[id][size]||0)+qty;db.stock[id]=(db.stock[id]||0)+qty;}
 const goodStock=(v,sizes)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>sizes.includes(k))&&sizes.every(s=>Number.isInteger(v[s])&&v[s]>=0&&v[s]<=9999);
 const safePhotoPath=p=>typeof p==='string'&&/^\/product-images\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(p);
 const shippingInfo=()=>({...db.shipping,demoOnly:true,note:'Sample PIN-prefix checks only, not actual courier availability.'});
 async function handle(req,res,p,method,url){
  if(method==='GET'&&p==='/api/v4/catalog')return json(res,200,{products:products(),demoOnly:true});
  if(method==='GET'&&p==='/api/v4/shipping'){
   const pin=url.searchParams.get('pin')||'';
   if(!/^[1-9]\d{5}$/.test(pin))return fail(res,400,'Enter a valid six-digit Indian PIN');
   return json(res,200,{pin,eligible:served(pin),demoOnly:true,note:'Illustrative delivery-zone rule. Not confirmed by any courier.',shipping:shippingInfo()});
  }
  if(method==='GET'&&p==='/api/v4/admin/catalog'){
   if(!auth(req,res,'admin'))return;
   return json(res,200,{products:products(),shipping:shippingInfo()});
  }
  if(method==='POST'&&p==='/api/v4/admin/products'){
   const s=auth(req,res,'admin');if(!s||!csrf(req,res,s))return;
   const b=await readBody(req);const name=clean(b.name,90),brand=clean(b.brand,60),category=clean(b.category,20),sku=clean(b.sku,30).toUpperCase();
   const sizes=Array.isArray(b.sizes)?[...new Set(b.sizes.map(v=>clean(v,12).toUpperCase()))]:[];
   if(name.length<3||brand.length<2||!CATEGORIES.includes(category)||!/^[A-Z0-9_-]{3,30}$/.test(sku)||!sizes.length||sizes.length>12||sizes.some(x=>!/^[A-Z0-9 ]{1,12}$/.test(x))||!Number.isInteger(b.price)||b.price<1||b.price>250000||!Number.isInteger(b.mrp)||b.mrp<b.price||b.mrp>250000||!goodStock(b.sizeStock,sizes))return fail(res,400,'Check product name, brand, category, SKU, prices, sizes and per-size stock');
   if(products().some(p=>p.sku.toUpperCase()===sku))return fail(res,409,'SKU already exists');
   const pNew={id:'srv-'+crypto.randomUUID(),sku,name,brand,category,price:b.price,mrp:b.mrp,sizes,type:'shirt',colors:['Demo'],description:clean(b.description,250),rating:4.5,reviews:0,badge:'NEW'};
   db.customProducts.push(pNew);db.variants[pNew.id]={...b.sizeStock};db.stock[pNew.id]=totalStock(pNew.id);persist();return json(res,201,{product:products().find(p=>p.id===pNew.id)});
  }
  const stockRoute=p.match(/^\/api\/v4\/admin\/stock\/((?:p\d{2})|(?:srv-[a-f0-9-]{36}))$/);
  if(method==='PUT'&&stockRoute){const s=auth(req,res,'admin');if(!s||!csrf(req,res,s))return;
   const target=product(stockRoute[1]);if(!target)return fail(res,404,'Product not found');const b=await readBody(req);
   if(!goodStock(b.sizeStock,target.sizes))return fail(res,400,'Provide nonnegative integer stock for every available size');
   db.variants[target.id]={...b.sizeStock};db.stock[target.id]=totalStock(target.id);persist();return json(res,200,{product:products().find(x=>x.id===target.id)});
  }
  const editRoute=p.match(/^\/api\/v4\/admin\/products\/(srv-[a-f0-9-]{36})$/);
  if(method==='PUT'&&editRoute){const s=auth(req,res,'admin');if(!s||!csrf(req,res,s))return;
   const existing=db.customProducts.find(x=>x.id===editRoute[1]);if(!existing)return fail(res,404,'Demo product not found');
   const b=await readBody(req),name=clean(b.name,90),brand=clean(b.brand,60),category=clean(b.category,20),price=b.price,mrp=b.mrp;
   if(name.length<3||brand.length<2||!CATEGORIES.includes(category)||!Number.isInteger(price)||price<1||price>250000||!Number.isInteger(mrp)||mrp<price||mrp>250000)return fail(res,400,'Invalid product details');
   Object.assign(existing,{name,brand,category,price,mrp,description:clean(b.description,250)});persist();return json(res,200,{product:products().find(x=>x.id===existing.id)});
  }
  if(method==='POST'&&p==='/api/v4/admin/photos'){
   const s=auth(req,res,'admin');if(!s||!csrf(req,res,s))return;
   const b=await readBody(req,1_200_000),target=db.customProducts.find(x=>x.id===b.productId);
   if(!target)return fail(res,404,'Only server-managed demo products support photo uploads');
   const match=typeof b.image==='string'&&b.image.match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/=]+)$/);
   if(!match)return fail(res,400,'Provide a JPEG, PNG or WebP image');
   const raw=Buffer.from(match[2],'base64');if(!raw.length||raw.length>LIMIT)return fail(res,413,'Image must be under 650 KB');
   const t=match[1],valid=t==='jpeg'?raw.subarray(0,3).equals(Buffer.from([255,216,255])):t==='png'?raw.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):raw.subarray(0,4).toString()==='RIFF'&&raw.subarray(8,12).toString()==='WEBP';
   if(!valid)return fail(res,400,'Image contents do not match its declared format');
   const folder=path.join(dataDir,'product-images');fs.mkdirSync(folder,{recursive:true,mode:0o700});const filename=crypto.randomUUID()+'.'+(t==='jpeg'?'jpg':t);fs.writeFileSync(path.join(folder,filename),raw,{flag:'wx',mode:0o600});target.imagePath='/product-images/'+filename;persist();return json(res,200,{imagePath:target.imagePath,note:'Local demo photo only; excluded from GitHub'});
  }
  if(method==='GET'&&p==='/api/v4/admin/shipping'){
   if(!auth(req,res,'admin'))return;return json(res,200,{shipping:shippingInfo()});
  }
  if(method==='PUT'&&p==='/api/v4/admin/shipping'){
   const s=auth(req,res,'admin');if(!s||!csrf(req,res,s))return;const b=await readBody(req);
   const prefixes=Array.isArray(b.prefixes)?[...new Set(b.prefixes.map(v=>String(v).trim()))]:[];
   if(!prefixes.length||prefixes.length>30||prefixes.some(x=>!/^[1-9]\d{2}$/.test(x))||!Number.isInteger(b.flatFee)||b.flatFee<0||b.flatFee>9999||!Number.isInteger(b.freeThreshold)||b.freeThreshold<0||b.freeThreshold>100000)return fail(res,400,'Use 1–30 valid 3-digit sample PIN prefixes and integer shipping amounts');
   db.shipping={prefixes,flatFee:b.flatFee,freeThreshold:b.freeThreshold};persist();return json(res,200,{shipping:shippingInfo()});
  }
  if(method==='GET'&&p==='/api/v4/returns'){
   const s=auth(req,res,'customer');if(!s)return;
   return json(res,200,{orders:db.orders.filter(o=>o.customerId===s.accountId).map(o=>({id:o.id,created:o.created,status:o.status,returnRequest:o.returnRequest||null}))});
  }
  const requestRoute=p.match(/^\/api\/v4\/returns\/(HT-LOCAL-[A-F0-9]{10})$/);
  if(method==='POST'&&requestRoute){const s=auth(req,res,'customer');if(!s||!csrf(req,res,s))return;
   const o=db.orders.find(x=>x.id===requestRoute[1]&&x.customerId===s.accountId);if(!o)return fail(res,404,'Order not found');if(o.status!=='DELIVERED_DEMO')return fail(res,409,'Only delivered demo orders may request a return');
   if(o.returnRequest)return fail(res,409,'Return request already recorded');
   if(Date.now()-Date.parse(o.created)>7*864e5)return fail(res,409,'Demo return window is 7 days from order placement');
   const b=await readBody(req),reason=clean(b.reason,200);if(reason.length<10)return fail(res,400,'Enter a test return reason with at least 10 characters');
   o.returnRequest={status:'REQUESTED_DEMO',reason,created:new Date().toISOString()};persist();return json(res,201,{returnRequest:o.returnRequest});
  }
  if(method==='GET'&&p==='/api/v4/admin/returns'){
   if(!auth(req,res,'admin'))return;return json(res,200,{orders:db.orders.filter(o=>o.returnRequest).map(o=>({id:o.id,status:o.status,returnRequest:o.returnRequest,items:o.items}))});
  }
  const reviewRoute=p.match(/^\/api\/v4\/admin\/returns\/(HT-LOCAL-[A-F0-9]{10})$/);
  if(method==='POST'&&reviewRoute){const s=auth(req,res,'admin');if(!s||!csrf(req,res,s))return;
   const o=db.orders.find(x=>x.id===reviewRoute[1]);if(!o||!o.returnRequest)return fail(res,404,'Return request not found');if(o.returnRequest.status!=='REQUESTED_DEMO')return fail(res,409,'Return already reviewed');const b=await readBody(req);
   if(!['APPROVED_DEMO','REJECTED_DEMO'].includes(b.status))return fail(res,400,'Invalid return decision');
   o.returnRequest.status=b.status;o.returnRequest.reviewed=new Date().toISOString();
   if(b.status==='APPROVED_DEMO'){for(const item of o.items)restore(item.id,item.size,item.qty)}
   persist();return json(res,200,{returnRequest:o.returnRequest,note:'No actual refund or parcel return occurs'});
  }
  return fail(res,404,'V4 endpoint not found');
 }
 return {handle,product,products,available,take,restore,served,shipping,totalStock,tracksSizes:id=>Boolean(db.variants[id])};
};
