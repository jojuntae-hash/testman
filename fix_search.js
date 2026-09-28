const fs = require('fs');
const files = [
  'app/memos/page.tsx',
  'app/insights/page.tsx',
  'app/settings/page.tsx',
  'app/sms/page.tsx',
  'components/CustomerDeleteModal.tsx',
  'components/CustomerList.tsx'
];

for(const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if(!content.includes('X,') && !content.includes(', X') && !content.includes('{ X }') && !content.includes(' X ')) {
    content = content.replace(/import \{([^}]+)\} from 'lucide-react'/, (match, p1) => {
      return `import {${p1}, X} from 'lucide-react'`;
    });
  }
  
  // Try to find the search input block
  const searchInputRegex = /(<input[^>]*placeholder=[^>]*onChange=\{\(e\) => setSearchTerm[^>]*>)/;
  if(searchInputRegex.test(content)) {
    if(!content.includes('<X size={18} className="clear-icon" onClick={() => setSearchTerm(\'\')} />')) {
      content = content.replace(searchInputRegex, '$1\n          {searchTerm && <X size={18} className="clear-icon" onClick={() => setSearchTerm(\'\')} />}');
    }
  } else {
    // try multi-line input tag
    const searchInputRegex2 = /(<input[^>]*placeholder=[^]*?onChange=\{[^\}]*setSearchTerm[^\}]*\}[^>]*>)/;
    if (searchInputRegex2.test(content)) {
       if(!content.includes('<X size={18} className="clear-icon" onClick={() => setSearchTerm(\'\')} />')) {
         content = content.replace(searchInputRegex2, '$1\n          {searchTerm && <X size={18} className="clear-icon" onClick={() => setSearchTerm(\'\')} />}');
       }
    } else {
       console.log('Regex missed for', file);
    }
  }
  fs.writeFileSync(file, content);
}
console.log('Done');
