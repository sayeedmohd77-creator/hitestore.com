const path=require('path');
const fs=require('fs'),vm=require('vm');
const storage=new Map(), handlers={};
const root={innerHTML:''},counter={innerText:'',textContent:'',hidden:false},wish={textContent:'',hidden:false},year={textContent:''},toast={textContent:'',classList:{add(){},remove(){}}};
const refs={'#main':root,'#cart-count':counter,'#wish-count':wish,'#year':year,'#toast':toast};
const context={
 window:{addEventListener:(type,f)=>handlers['window_'+type]=f,scrollTo:()=>{}},
 document:{querySelector:sel=>refs[sel]||null,addEventListener:(type,f)=>handlers['document_'+type]=f,title:''},
 location:{hash:'#/'},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 console,URLSearchParams,Date,Math,Number,JSON,String,Array,encodeURIComponent,decodeURIComponent,setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','data.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','js','app.js'),'utf8'),context);
const assert=(test,msg)=>{if(!test)throw Error(msg);console.log('PASS:',msg)};
assert(root.innerHTML.includes('Wear what'),'home hero');
assert((root.innerHTML.match(/class="product-card"/g)||[]).length===8,'home has eight product cards');
function route(hash){context.location.hash='#'+hash;handlers['window_hashchange']();}
function action(a,id,more={}) { handlers['document_click']({target:{closest:()=>({dataset:{action:a,id,...more}})}}); }
route('/shop?category=Women');assert(root.innerHTML.includes('Women collection'),'women category view');
route('/product/p02');assert(root.innerHTML.includes('Weekend Midi Dress'),'product detail');
action('add-to-cart','p02');assert(JSON.parse(storage.get('hitestore_cart')).length===1,'add to cart saves local data');
route('/cart');assert(root.innerHTML.includes('Order summary'),'cart summary');
assert(root.innerHTML.includes('Cash on Delivery (COD)'),'COD checkout option displayed');
assert(root.innerHTML.includes('value="ONLINE" disabled'),'online payment disabled in demo');
assert(root.innerHTML.includes('Amount due on delivery'),'COD due amount shown');
action('place-order');assert(JSON.parse(storage.get('hitestore_orders')).length===1,'demo checkout creates local order');
assert(JSON.parse(storage.get('hitestore_orders'))[0].paymentMethod==='COD','order records COD as payment method');
assert(JSON.parse(storage.get('hitestore_orders'))[0].paymentStatus==='PENDING_COLLECTION','new COD order awaits collection');
route('/orders');assert(root.innerHTML.includes('Payment pending (demo)'),'order history shows COD pending');
assert(JSON.parse(storage.get('hitestore_stock'))['p02']===14,'demo order deducts stock');
route('/admin');assert(root.innerHTML.includes('Inventory manager'),'admin inventory panel');
action('admin-tab',undefined,{tab:'orders'});assert(root.innerHTML.includes('Pending collection (demo)'),'admin displays pending COD collection');
const codId=JSON.parse(storage.get('hitestore_orders'))[0].id;action('mark-cod-collected',codId);
assert(JSON.parse(storage.get('hitestore_orders'))[0].paymentStatus==='SIMULATED_COLLECTED','demo admin can mark COD collected');
route('/orders');assert(root.innerHTML.includes('Marked collected (demo)'),'order history shows collected status');
route('/wishlist');action('wishlist','p01');assert(JSON.parse(storage.get('hitestore_wishes')).includes('p01'),'wishlist persists');
console.log('All VM view + interaction tests passed');
