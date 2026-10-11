import fs from 'fs';
import path from 'path';

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Add loading="lazy" to <img tags that don't have it
      content = content.replace(/<img\s+(?![^>]*loading=["']lazy["'])([^>]+)>/g, '<img loading="lazy" $1>');
      
      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Modified ${fullPath}`);
      }
    }
  }
}

processDirectory('./src/tools');
console.log('Done');
