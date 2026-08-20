const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\Juand\\Documents\\A-DESKTOP\\Repositorios\\Movil_App\\src\\app\\admin.tsx', 'utf-8');
c = c.replace('\\n// ── Admin Auth Wrapper', '\n// ── Admin Auth Wrapper');
fs.writeFileSync('C:\\Users\\Juand\\Documents\\A-DESKTOP\\Repositorios\\Movil_App\\src\\app\\admin.tsx', c);
