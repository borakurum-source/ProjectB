import fs from 'fs';

const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /'gemini-1\.5-flash'/g,
  "'gemini-3.7-flash'"
);

code = code.replace(
  /'text-embedding-004'/g,
  "'gemini-embedding-2'"
);

fs.writeFileSync(path, code);
