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
action('place-order');assert(JSON.parse(storage.get('hitestore_orders')).length===1,'demo checkout creates local order');
assert(JSON.parse(storage.get('hitestore_stock'))['p02']===14,'demo order deducts stock');
route('/admin');assert(root.innerHTML.includes('Inventory manager'),'admin inventory panel');
route('/wishlist');action('wishlist','p01');assert(JSON.parse(storage.get('hitestore_wishes')).includes('p01'),'wishlist persists');
console.log('All VM view + interaction tests passed');
