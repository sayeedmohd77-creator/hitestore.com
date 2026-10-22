(() => {
'use strict';
// V3 local development account / COD / staff experience. NO production payments or deliveries.
const main=document.querySelector('#main');
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
let session={authenticated:false};
const api=async(path,{method='GET',body}={})=>{
 const headers={'Accept':'application/json'};
 if(body){headers['Content-Type']='application/json';if(session.csrf)headers['X-CSRF-Token']=session.csrf}
 const res=await fetch('/api'+path,{method,headers,credentials:'same-origin',...(body?{body:JSON.stringify(body)}:{})});
 let data={};try{data=await res.json()}catch{throw Error('The local server returned an unexpected response')}
 if(!res.ok)throw Error(data.error||'Request failed');return data;
};
const notice=(title,body)=>`<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">LOCAL DEVELOPMENT ONLY</span><h1>${esc(title)}</h1><p>${esc(body)}</p></div></div>`;
const alert=message=>`<div class="v3-alert" role="alert">${esc(message)}</div>`;
const basicLabel=(label,field,required=true)=>`<label class="v3-field"><span>${label}</span><input ${field} ${required?'required':''}></label>`;
const navAccount=()=>`<div class="v3-quicknav"><a href="#/account">ACCOUNT</a><a href="#/checkout">ADDRESS & COD</a><a href="#/my-orders">MY SERVER ORDERS</a><a href="#/manage-orders">STAFF ORDERS</a><a href="#/catalog-admin">STOCK & SHIPPING</a><a href="#/returns">RETURNS</a></div>`;
// Browser-side hints mirror the server rules. The server is always authoritative.
function validateDelivery(f){
 const v=k=>String(f[k]??'').trim();
 const checks=[
  ['name',v('name').length>=2,'Recipient name must contain at least 2 characters.'],
  ['phone',/^\d{10}$/.test(v('phone')),'Enter an Indian mobile number with exactly 10 digits.'],
  ['line1',v('line1').length>=8,'Address line 1 needs at least 8 characters (include building and street).'],
  ['city',v('city').length>=2,'City must contain at least 2 characters.'],
  ['state',v('state').length>=2,'State must contain at least 2 characters.'],
  ['pin',/^[1-9]\d{5}$/.test(v('pin')),'Enter a valid six-digit Indian PIN code (the first digit cannot be 0).']
 ];
 const problem=checks.find(([,ok])=>!ok);
 if(problem){const error=new Error(problem[2]);error.field=problem[0];throw error}
}

async function show(path){
 const marker=path;main.innerHTML=notice('Loading HiteStore V3…','Accessing the local development API.');
 try{
 session=await api('/session');if(location.hash.slice(1).split('?')[0]!==marker)return;
 if(path==='/account')main.innerHTML=accountPage();
 if(path==='/checkout')main.innerHTML=checkoutPage();
 if(path==='/my-orders')main.innerHTML=await myOrdersPage();
 if(path==='/manage-orders')main.innerHTML=await staffPage();
 }catch(e){main.innerHTML=notice('Local account service unavailable.',e.message+' — Start the V3 Node.js server, not the older V2 server.');}
}
function accountPage(){
 return `<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">HITESTORE V3 ACCOUNT</span><h1>Welcome to HiteStore.</h1><p>Test accounts are stored on this laptop only. Use invented data, not real customer details.</p></div>${navAccount()}<div class="v3-layout">${session.authenticated&&session.role==='customer'?`<section class="v3-panel"><h2>Signed in</h2><p>${esc(session.name)} · ${esc(session.email)}</p><p>Your COD checkout and private development orders are available.</p><button class="btn btn-dark" data-v3="logout">SIGN OUT</button></section>`:`<section class="v3-panel"><h2>Sign in to your local test account</h2><form id="v3-login">${basicLabel('Email','name="email" type="email" maxlength="130" autocomplete="username"')}${basicLabel('Password','name="password" type="password" autocomplete="current-password"')}<button class="btn btn-accent" type="submit">SIGN IN</button></form></section><section class="v3-panel"><h2>Create a local test account</h2><form id="v3-register">${basicLabel('Name','name="name" maxlength="70" autocomplete="name"')}${basicLabel('Email','name="email" type="email" maxlength="130" autocomplete="email"')}${basicLabel('Password (10 characters minimum)','name="password" type="password" minlength="10" maxlength="128" autocomplete="new-password"')}<button class="btn btn-dark" type="submit">CREATE TEST ACCOUNT</button></form></section>`}</div></div>`;
}
function checkoutPage(){
 const items=window.HiteStoreV3Cart?.()||[],valid=items.filter(x=>!x.id.startsWith('custom-'));
 return `<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">ADDRESS & COD CHECKOUT — TEST ONLY</span><h1>Where should it go?</h1><p>Development-only checkout. Indian PIN format and illustrative delivery-zone rules are checked; no real courier has verified serviceability.</p></div>${navAccount()}${!session.authenticated||session.role!=='customer'?`<div class="v3-panel">${alert('Create a local test account or sign in before proceeding.')}<a class="btn btn-dark" href="#/account">GO TO ACCOUNT ↗</a></div>`:!valid.length?`<div class="v3-panel">${alert('Your bag has no seeded products. Add a product from the collection first. Custom browser products are not yet supported by server orders.')}<a href="#/shop" class="btn btn-dark">BROWSE PRODUCTS ↗</a></div>`:`<div class="v3-layout"><section class="v3-panel"><h2>Demo delivery details</h2><p class="microcopy">Use test names, phone numbers and addresses only. Do not enter real customer information.</p><form id="v3-checkout">${basicLabel('Recipient name','name="name" maxlength="80" placeholder="Demo Customer"')}${basicLabel('Indian mobile (10 digits)','name="phone" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" placeholder="9999999999"')}${basicLabel('Address line 1','name="line1" maxlength="160" placeholder="Test building and street"')}${basicLabel('Address line 2 (optional)','name="line2" maxlength="160"',false)}${basicLabel('City','name="city" maxlength="80" placeholder="Hyderabad"')}${basicLabel('State','name="state" maxlength="80" placeholder="Telangana"')}${basicLabel('PIN code','name="pin" inputmode="numeric" pattern="[1-9][0-9]{5}" maxlength="6" placeholder="500001"')}<div class="v4-pin-check"><button type="button" class="btn btn-light" data-v4="pin-check">CHECK DEMO PIN ZONE</button><p id="v4-pin-result" aria-live="polite"></p></div><div class="v3-payment"><strong>PAYMENT: CASH ON DELIVERY (TEST)</strong><p>Payment remains pending in your test order. No courier booking, bank transaction or real sale occurs.</p></div><button class="btn btn-accent btn-block" type="submit">CREATE SERVER-SIDE COD TEST ORDER ↗</button></form></section><aside class="v3-panel"><h2>Current bag</h2>${valid.map(i=>`<div class="v3-summary-line"><span>${esc(i.id)} / ${esc(i.size)} × ${Number(i.qty)}</span><span>${esc(i.name||'Item')}</span></div>`).join('')}<p class="microcopy">The server rechecks stock and calculates prices; never trust totals submitted by a browser.</p><p class="microcopy">Shipping: demo ₹99 below ₹1,999 subtotal, otherwise free. WELCOME10 discount is checked on the server.</p></aside></div>`}</div>`;
}
const orderCard=o=>`<article class="v3-order"><div><strong>${esc(o.id)}</strong><p>${esc(o.items.map(i=>`${i.name} (${i.size}) ×${i.qty}`).join(', '))}</p><p>Delivery: ${esc(o.delivery.city)}, ${esc(o.delivery.state)} ${esc(o.delivery.pin)}</p><p>COD: ${esc(o.paymentStatus)} · ${esc(o.status)}</p></div><strong>${money(o.total)}</strong></article>`;
async function myOrdersPage(){if(!session.authenticated||session.role!=='customer')return `<div class="content-wide page-wrap">${navAccount()}<section class="v3-panel">${alert('Sign in from Account to view your own orders.')}<a href="#/account" class="btn btn-dark">ACCOUNT ↗</a></section></div>`;const {orders}=await api('/orders');return `<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">ACCOUNT ORDER HISTORY</span><h1>My local test orders.</h1><p>These are stored on your laptop's local development server (not in Chrome localStorage).</p></div>${navAccount()}${orders.length?orders.map(orderCard).join(''):`<p>No server-backed test orders yet. <a href="#/checkout">Try COD checkout.</a></p>`}</div>`}
async function staffPage(){
 if(!session.authenticated||session.role!=='admin')return `<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">AUTHORIZED STAFF — LOCAL DEV</span><h1>Protected order workspace.</h1><p>Admin password is set in the PowerShell environment, not in source code.</p></div>${navAccount()}<section class="v3-panel"><form id="v3-admin-login">${basicLabel('Local administrator password','name="password" type="password" autocomplete="current-password"')}<button class="btn btn-dark">SIGN IN AS ADMIN</button></form></section></div>`;
 const {orders}=await api('/admin/orders');return `<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">SECURED SERVER ORDERS — TEST ONLY</span><h1>Staff order management.</h1><p>No real shipment or payment collection is performed.</p></div>${navAccount()}<button class="btn btn-light" data-v3="logout">STAFF SIGN OUT</button><div class="v3-admin-orders">${orders.length?orders.map(o=>`<article class="v3-panel"><div class="v3-order"><div><strong>${esc(o.id)}</strong><p>${esc(o.customerEmail)}</p><p>${esc(o.items.map(i=>`${i.name} ×${i.qty}`).join(', '))}</p><p>Test delivery: ${esc(o.delivery.name)}, ${esc(o.delivery.city)}, ${esc(o.delivery.pin)}</p><p>${esc(o.status)} · ${esc(o.paymentStatus)}</p></div><strong>${money(o.total)}</strong></div><div class="v3-admin-actions">${['PACKED_DEMO','SHIPPED_DEMO','DELIVERED_DEMO','CANCELLED_DEMO'].map(v=>`<button class="text-button" data-v3="status" data-id="${esc(o.id)}" data-value="${v}">${v.replace('_DEMO','')}</button>`).join('')}<button class="text-button" data-v3="payment" data-id="${esc(o.id)}">MARK COD COLLECTED (TEST)</button></div></article>`).join(''):'<p>No local test orders yet.</p>'}</div></div>`;
}
document.addEventListener('submit',async e=>{
 const id=e.target.id;if(!['v3-register','v3-login','v3-checkout','v3-admin-login'].includes(id))return;
 e.preventDefault();const form=e.target;
 // Remove any message from a previous attempt so errors never stack up.
 form.querySelectorAll('.v3-alert').forEach(el=>el.remove());
 if(form.dataset.submitting==='true')return;
 form.dataset.submitting='true';
 const button=form.querySelector('button[type="submit"],button:not([type])');if(button)button.disabled=true;
 const f=Object.fromEntries(new FormData(form));
 try{
  if(id==='v3-register'||id==='v3-login'){session=await api(id==='v3-register'?'/register':'/login',{method:'POST',body:f});location.hash='#/checkout';}
  else if(id==='v3-admin-login'){session=await api('/admin/login',{method:'POST',body:{password:f.password}});await show('/manage-orders');}
  else if(id==='v3-checkout'){
   validateDelivery(f);
   const items=window.HiteStoreV3Cart?.()||[];const order=await api('/orders',{method:'POST',body:{items:items.map(({id,size,qty})=>({id,size,qty})),delivery:{name:f.name,phone:f.phone,line1:f.line1,line2:f.line2,city:f.city,state:f.state,pin:f.pin},paymentMethod:'COD',coupon:window.HiteStoreV3Coupon?.()||''}});
   window.HiteStoreV3ClearCart?.();alert('Test order '+order.order.id+' saved on the local server. No real purchase occurred.');location.hash='#/my-orders';
  }
 }catch(error){
  const el=document.createElement('div');el.className='v3-alert';el.setAttribute('role','alert');el.textContent=error.message;
  form.prepend(el);
  if(error.field){const field=form.elements.namedItem(error.field);if(field)field.focus()}
 }finally{form.dataset.submitting='false';if(button)button.disabled=false}
});
document.addEventListener('click',async e=>{
 const el=e.target.closest('[data-v3]');if(!el)return;e.preventDefault();const action=el.dataset.v3;
 try{
  if(action==='logout'){await api('/logout',{method:'POST',body:{ok:true}});session={authenticated:false};location.hash='#/account';await show('/account');}
  if(action==='status'||action==='payment'){
   if(!confirm('Update this LOCAL TEST order only?'))return;
   await api('/admin/orders/'+encodeURIComponent(el.dataset.id)+'/'+action,{method:'POST',body:action==='status'?{status:el.dataset.value}:{status:'COLLECTED_DEMO'}});
   await show('/manage-orders');
  }
 }catch(error){alert(error.message)}
});
window.HiteStoreV3={show};
const current=location.hash.slice(1).split('?')[0];if(['/account','/checkout','/my-orders','/manage-orders'].includes(current))show(current);
})();
