const fs = require('fs');

const routeContent = fs.readFileSync('D:/masa/dev/fest-2026-website/app/api/data/route.ts', 'utf8');
const lines = routeContent.split('\n');

console.log(lines.slice(100, 180).join('\n'));
