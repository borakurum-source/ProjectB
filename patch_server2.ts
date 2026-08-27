import fs from 'fs';

const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'maxRetries = 3,',
  'maxRetries = 5,'
);

code = code.replace(
  'initialDelayMs = 1500',
  'initialDelayMs = 2500'
);

fs.writeFileSync(path, code);
