(() => {
'use strict';
// HiteStore V4: offline-only management UI. No live shipping, refunds or online payments.
const $=s=>document.querySelector(s),main=$('#main'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let session={authenticated:false},catalog=[],shipping={prefixes:[],flatFee:99,freeThreshold:1999},editId='';
const formVal=(f,k)=>String(new FormData(f).get(k)||'').trim();
const alertHTML=s=>`<p role="alert" class="v3-alert">${esc(s)}</p>`;
const money=n=>'₹'+Number(n||0).toLocaleString('en-IN');
async function api(endpoint,options={}){
 const headers={Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{})};
 if(options.body&&session.csrf)headers['X-CSRF-Token']=session.csrf;
 const res=await fetch('/api'+endpoint,{method:options.method||'GET',headers,credentials:'same-origin',...(options.body?{body:JSON.stringify(options.body)}:{})});
 const data=await res.json().catch(()=>({error:'Unexpected server response'}));if(!res.ok)throw Error(data.error||'Request failed');return data;
}
const nav=()=>`<div class="v3-quicknav"><a href="#/manage-orders">STAFF ORDERS</a><a href="#/catalog-admin">PRODUCTS & SHIPPING</a><a href="#/my-orders">MY ORDERS</a><a href="#/returns">RETURNS DEMO</a></div>`;
const field=(label,name,value='',type='text')=>`<label class="v3-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" required></label>`;
const categoryField=(value='Women')=>`<label class="v3-field"><span>Category</span><select name="category" required>${['Women','Men','Kids','Accessories'].map(cat=>`<option value="${cat}" ${cat===value?'selected':''}>${cat}</option>`).join('')}</select></label>`;
const stockFields=p=>p.sizes.map(size=>`<label class="v4-size"><span>${esc(size)}</span><input aria-label="Stock for ${esc(p.name)} size ${esc(size)}" name="qty_${esc(size)}" type="number" min="0" max="9999" required value="${Number(p.sizeStock?.[size]??0)}"></label>`).join('');
function stockCard(p){return `<article class="v4-stock-card"><div class="v4-item-header"><div><strong>${esc(p.name)}</strong><p>${esc(p.sku)} · ${esc(p.category)} · ${money(p.price)}</p><p>Total on server: <b>${p.stock}</b> ${p.sizeStock?'— size-wise tracked':'— aggregate stock, not yet allocated by size'}</p></div>${p.imagePath?`<img class="v4-thumb" src="${esc(p.imagePath)}" alt="Product photograph">`:''}</div><form class="v4-stock-form" data-product-id="${esc(p.id)}"><div class="v4-size-grid">${stockFields(p)}</div><button class="btn btn-dark" type="submit">SAVE SIZE STOCK</button></form>${p.editable?`<div class="v4-inline-actions"><button class="text-button" data-v4="edit-product" data-id="${esc(p.id)}">EDIT DETAILS</button><label class="v4-photo-control">UPLOAD PHOTO (MAX 650 KB)<input type="file" accept="image/jpeg,image/png,image/webp" data-v4-upload="${esc(p.id)}"></label></div>`:''}</article>`}
function productForm(p){return `<section class="v3-panel"><h2>${p?'Edit product':'Add server-managed demo product'}</h2><form id="v4-product-form" data-product-id="${esc(p?.id||'')}"><div class="v4-fields">${field('Product name','name',p?.name||'')}${field('Brand','brand',p?.brand||'')}${categoryField(p?.category||'Women')}${p?'':field('Unique SKU','sku','HT-NEW-001')}${field('Price ₹','price',p?.price||799,'number')}${field('MRP ₹','mrp',p?.mrp||999,'number')}${p?'':field('Sizes separated by commas','sizes','S,M,L')}${field('Description','description',p?.description||'Sample local catalogue product')}</div>${p?'':`<p class="microcopy">For each size, stock initially starts at 0. Set size-wise stock below after creating the product.</p>`}<button class="btn btn-accent">${p?'SAVE PRODUCT DETAILS':'CREATE PRODUCT'}</button></form></section>`}
async function catalogPage(){if(!session.authenticated||session.role!=='admin')return `<div class="content-wide page-wrap"><h1>Staff sign-in required</h1>${nav()}<p>Sign in through Staff Orders using your local test admin password.</p><a href="#/manage-orders" class="btn btn-dark">GO TO STAFF LOGIN</a></div>`;
 const res=await api('/v4/admin/catalog');catalog=res.products;shipping=res.shipping;
 const e=catalog.find(p=>p.id===editId&&p.editable);
 const returns=(await api('/v4/admin/returns')).orders;
 return `<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">HITESTORE V4 — LOCAL STAFF DEMO</span><h1>Products, stock & delivery settings.</h1><p>Server-backed catalogue and size-wise stock. Uploaded photos stay in your laptop's runtime folder, outside GitHub. Not yet safe to publish.</p></div>${nav()}<div id="v4-feedback" aria-live="polite"></div><div class="v4-admin-layout"><div>${productForm(e)}</div><section class="v3-panel"><h2>Demo shipping rules</h2><p class="microcopy">These sample 3-digit PIN prefixes are NOT courier-approved coverage.</p><form id="v4-shipping-form">${field('Sample PIN prefixes (comma-separated)','prefixes',shipping.prefixes.join(', '))}${field('Flat delivery fee (₹)','flatFee',shipping.flatFee,'number')}${field('Free shipping from (₹)','freeThreshold',shipping.freeThreshold,'number')}<button class="btn btn-dark">SAVE DEMO SHIPPING RULES</button></form></section></div><section class="v4-section"><h2>Server catalogue (${catalog.length})</h2><p>Products using aggregate legacy stock can be converted to size-wise stock by entering quantities and saving them. This replaces their old aggregate count.</p><div class="v4-stock-list">${catalog.map(stockCard).join('')}</div></section><section class="v4-section"><h2>Return requests (demo)</h2>${returns.length?returns.map(o=>`<article class="v3-panel"><strong>${esc(o.id)}</strong><p>${esc(o.returnRequest.reason)} — ${esc(o.returnRequest.status)}</p>${o.returnRequest.status==='REQUESTED_DEMO'?`<button class="btn btn-dark" data-v4="review" data-id="${esc(o.id)}" data-decision="APPROVED_DEMO">APPROVE TEST RETURN</button> <button class="btn btn-light" data-v4="review" data-id="${esc(o.id)}" data-decision="REJECTED_DEMO">REJECT TEST RETURN</button>`:''}</article>`).join(''):'<p>No local return requests.</p>'}</section></div>`;
}
async function returnsPage(){if(!session.authenticated||session.role!=='customer')return `<div class="content-wide page-wrap"><h1>Customer sign-in required</h1>${nav()}<a href="#/account" class="btn btn-dark">GO TO ACCOUNT</a></div>`;
 const {orders}=await api('/v4/returns');return `<div class="content-wide page-wrap"><div class="page-heading"><span class="overline">LOCAL V4 DEMO</span><h1>Returns & exchanges.</h1><p>Test requests only. No physical collection, exchange, refund or store credit is issued.</p></div>${nav()}<div id="v4-feedback" aria-live="polite"></div>${orders.length?orders.map(o=>`<section class="v3-panel"><strong>${esc(o.id)}</strong><p>${esc(o.status)}</p>${o.returnRequest?`<p>Return: ${esc(o.returnRequest.status)} — ${esc(o.returnRequest.reason)}</p>`:o.status==='DELIVERED_DEMO'?`<form class="v4-return-form" data-order-id="${esc(o.id)}"><label class="v3-field"><span>Reason (10–200 characters)</span><input name="reason" minlength="10" maxlength="200" required placeholder="Demo item does not fit"></label><button class="btn btn-dark">REQUEST TEST RETURN</button></form>`:'<p class="microcopy">Returns become available when this test order is marked delivered.</p>'}</section>`).join(''):'<p>No server orders yet.</p>'}</div>`}
async function show(path){main.innerHTML=`<div class="content-wide page-wrap"><p>Loading V4 local service…</p></div>`;try{session=await api('/session');if(location.hash.split('?')[0]!=='#'+path)return;main.innerHTML=path==='/catalog-admin'?await catalogPage():await returnsPage()}catch(err){main.innerHTML=`<div class="content-wide page-wrap">${alertHTML(err.message)}</div>`}}
function feedback(message){const f=$('#v4-feedback');if(f){f.innerHTML=alertHTML(message);f.scrollIntoView({block:'nearest'})}else window.alert(message)}
document.addEventListener('submit',async e=>{
 const form=e.target;if(!['v4-product-form','v4-shipping-form'].includes(form.id)&&!form.matches('.v4-stock-form,.v4-return-form'))return;e.preventDefault();
 const btn=form.querySelector('button[type="submit"],button:not([type])');if(btn)btn.disabled=true;
 try{
  if(form.id==='v4-product-form'){const id=form.dataset.productId;const productData={name:formVal(form,'name'),brand:formVal(form,'brand'),category:formVal(form,'category'),price:Number(formVal(form,'price')),mrp:Number(formVal(form,'mrp')),description:formVal(form,'description')};
    if(id){await api('/v4/admin/products/'+encodeURIComponent(id),{method:'PUT',body:productData});editId=''}
    else{productData.sku=formVal(form,'sku');productData.sizes=formVal(form,'sizes').toUpperCase().split(',').map(x=>x.trim()).filter(Boolean);productData.sizeStock=Object.fromEntries(productData.sizes.map(s=>[s,0]));await api('/v4/admin/products',{method:'POST',body:productData})}
  }else if(form.id==='v4-shipping-form'){await api('/v4/admin/shipping',{method:'PUT',body:{prefixes:formVal(form,'prefixes').split(',').map(x=>x.trim()),flatFee:Number(formVal(form,'flatFee')),freeThreshold:Number(formVal(form,'freeThreshold'))}})}
  else if(form.classList.contains('v4-stock-form')){const p=catalog.find(x=>x.id===form.dataset.productId);const sizeStock=Object.fromEntries(p.sizes.map(size=>[size,Number(formVal(form,'qty_'+size))]));await api('/v4/admin/stock/'+encodeURIComponent(p.id),{method:'PUT',body:{sizeStock}})}
  else if(form.classList.contains('v4-return-form'))await api('/v4/returns/'+encodeURIComponent(form.dataset.orderId),{method:'POST',body:{reason:formVal(form,'reason')}});
  window.HiteStoreRefreshCatalog?.();await show(location.hash.slice(1).split('?')[0]);feedback('Saved in LOCAL V4 demo database. No live store or payment affected.');
 }catch(err){feedback(err.message)}finally{if(btn)btn.disabled=false}
});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-v4]');if(!b)return;e.preventDefault();
 const action=b.dataset.v4;
 try{
  if(action==='edit-product'){editId=b.dataset.id;await show('/catalog-admin');window.scrollTo({top:0})}
  if(action==='pin-check'){const form=$('#v3-checkout');const pin=form?.elements.namedItem('pin')?.value||'';const res=await api('/v4/shipping?pin='+encodeURIComponent(pin));const notice=res.eligible?'Within configured DEMO delivery prefixes.':'Outside configured DEMO delivery prefixes.';const box=$('#v4-pin-result');if(box)box.textContent=notice+' Not a real courier check.';}
  if(action==='review'){if(!window.confirm('Confirm TEST return decision? No actual refund occurs.'))return;await api('/v4/admin/returns/'+encodeURIComponent(b.dataset.id),{method:'POST',body:{status:b.dataset.decision}});await show('/catalog-admin');feedback('Return marked '+b.dataset.decision+' (demo only)')}
 }catch(err){feedback(err.message)}
});
document.addEventListener('change',async e=>{
 const fileInput=e.target.closest('[data-v4-upload]');if(!fileInput||!fileInput.files?.[0])return;
 const file=fileInput.files[0];if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>650*1024){feedback('Please choose a JPEG, PNG or WebP image smaller than 650 KB.');return}
 try{const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
  await api('/v4/admin/photos',{method:'POST',body:{productId:fileInput.dataset.v4Upload,image}});await show('/catalog-admin');feedback('Demo photo saved locally (never pushed to GitHub).')
 }catch(err){feedback(err.message)}
});
window.HiteStoreV4={show};
const here=location.hash.slice(1).split('?')[0];if(['/catalog-admin','/returns'].includes(here))show(here);
})();
