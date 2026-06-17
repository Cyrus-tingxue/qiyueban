const fs = require('fs');
const txt = fs.readFileSync('frontend/src/pages/MessagesPage.jsx', 'utf-8');
const lines = txt.split('\n');
const idx = lines.findIndex(l => l.includes('conversations.map'));
console.log(lines.slice(idx, idx+30).join('\n'));
