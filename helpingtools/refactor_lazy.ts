import fs from 'fs';

const filePath = './src/pages/ToolPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find all imports from '../tools/...'
const importRegex = /import\s+\{\s*([a-zA-Z0-9_]+)\s*\}\s+from\s+['"](\.\.\/tools\/[^'"]+)['"];/g;
let match;
const imports: { name: string, path: string }[] = [];

while ((match = importRegex.exec(content)) !== null) {
  imports.push({ name: match[1], path: match[2] });
}

// Remove all these imports
content = content.replace(/import\s+\{\s*[a-zA-Z0-9_]+\s*\}\s+from\s+['"]\.\.\/tools\/[^'"]+['"];\n/g, '');

// Replace the TOOL_COMPONENTS definition
const lazyImports = imports.map(imp => `  '${imp.name}': React.lazy(() => import('${imp.path}').then(m => ({ default: m.${imp.name} })))`).join(',\n');

// We need to map the tool IDs to the component names.
// Looking at the file, the keys in TOOL_COMPONENTS are the tool IDs, and the values are the component names.
// Let's parse the existing TOOL_COMPONENTS object.
const toolComponentsRegex = /const TOOL_COMPONENTS: Record<string, React\.FC> = \{([\s\S]*?)\};/;
const toolComponentsMatch = content.match(toolComponentsRegex);

if (toolComponentsMatch) {
  const body = toolComponentsMatch[1];
  const lines = body.split('\n').filter(line => line.trim() !== '');
  
  const newBodyLines = lines.map(line => {
    const parts = line.split(':');
    if (parts.length === 2) {
      const key = parts[0].trim();
      const compName = parts[1].trim().replace(',', '');
      const imp = imports.find(i => i.name === compName);
      if (imp) {
        return `  ${key}: React.lazy(() => import('${imp.path}').then(m => ({ default: m.${compName} }))),`;
      }
    }
    return line;
  });
  
  const newToolComponents = `const TOOL_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC>> = {\n${newBodyLines.join('\n')}\n};`;
  
  content = content.replace(toolComponentsRegex, newToolComponents);
  
  // Also need to wrap the component rendering in Suspense
  // React.createElement(TOOL_COMPONENTS[tool.id]) -> <React.Suspense fallback={<div className="p-12 flex justify-center"><div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>}>{React.createElement(TOOL_COMPONENTS[tool.id])}</React.Suspense>
  
  content = content.replace(
    /React\.createElement\(TOOL_COMPONENTS\[tool\.id\]\)/,
    `<React.Suspense fallback={<div className="p-12 flex justify-center"><div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div></div>}>{React.createElement(TOOL_COMPONENTS[tool.id])}</React.Suspense>`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated ToolPage.tsx');
} else {
  console.log('Could not find TOOL_COMPONENTS');
}
