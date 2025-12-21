const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the position just before the final closing tags
const marker = '      )}\n    \u003c/div\u003e\n  );';
const footerCode = `      )}\n\n      {/* FOOTER CREDIT */}\n      \u003cfooter className="app-footer"\u003e\n        \u003cp\u003eDeveloped by Aniket Patil\u003c/p\u003e\n      \u003c/footer\u003e\n    \u003c/div\u003e\n  );`;

content = content.replace(marker, footerCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Footer added successfully!');
