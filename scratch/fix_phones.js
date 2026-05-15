const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'initialData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace "1012345678" with "01012345678" in phone fields
// Regex to find "key": "10..." and replace with "key": "010..."
content = content.replace(/"(전화번호|핸드폰번호|설치전화번호|설치핸드폰번호)":\s*"10/g, '"$1": "010');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully fixed phone numbers in initialData.ts');
