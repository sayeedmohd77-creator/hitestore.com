'use strict';
// Offline development server. DO NOT EXPOSE PUBLICLY. Runs ONLY on loopback.
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {handleAPI}=require('./backend/dev-commerce');
const root=__dirname;
const port=Number(process.env.PORT||3009);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{return res.writeHead(400).end('Bad request')}
  if(pathname.startsWith('/api/'))return handleAPI(req,res);
  if(!['GET','HEAD'].includes(req.method))return res.writeHead(405).end('Method not allowed');
  if(pathname==='/'||pathname==='/index.html')pathname='/index.html';
  // Explicit allowlist: never serve server, backend, runtime, credentials or .git files.
  if(!(/^\/index\.html$|^\/(?:css|js|assets)\/[a-zA-Z0-9._-]+\.(?:css|js|svg|jpg|jpeg|png|webp|ico)$/.test(pathname)))return res.writeHead(404).end('Not found');
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end('Forbidden');
  fs.stat(file,(err,stat)=>{if(err||!stat.isFile())return res.writeHead(404).end('Not found');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res)});
});
server.listen(port,'127.0.0.1',()=>console.log(`HiteStore V3 LOCAL ONLY running at http://localhost:${port}\nAccount, COD and admin APIs are for LOCAL DEVELOPMENT. No real orders/payments.`));
