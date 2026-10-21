'use strict';
// Dependency-free development server. Listen on loopback only, never on public interfaces.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const port = Number(process.env.PORT || 3009);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
const server = http.createServer((req,res)=>{
  if (req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405).end('Method not allowed');return;}
  let pathname;try {pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch {res.writeHead(400).end('Bad request');return;}
  if(pathname==='/'||pathname==='/index.html') pathname='/index.html';
  if(pathname.includes('\0')||pathname.includes('\\')){res.writeHead(400).end('Bad request');return;}
  const filepath=path.resolve(root, '.'+pathname);
  if(filepath!==path.join(root,'index.html') && !filepath.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
  if (/(^|\/)\.|(^|\/)(node_modules|tools)(\/|$)|\.(ps1|md|gitignore|py)$/.test(pathname)){res.writeHead(404).end('Not found');return;}
  fs.stat(filepath,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}const ext=path.extname(filepath).toLowerCase();res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});if(req.method==='HEAD')res.end();else fs.createReadStream(filepath).pipe(res);});
});
server.listen(port,'127.0.0.1',()=>console.log(`\nHiteStore LOCAL DEMO running at http://localhost:${port}\nPress Ctrl+C to stop.\n`));
