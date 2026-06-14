const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('1hr') || content.includes('1-hour') || content.includes('1 hr') || content.includes('timeSlot') || content.includes('TimeSlot')) {
        console.log(fullPath);
      }
    }
  }
}

search('d:\\client_projects\\healthmitraus_project\\healthmitra-web\\components');
search('d:\\client_projects\\healthmitraus_project\\healthmitra-web\\app');
