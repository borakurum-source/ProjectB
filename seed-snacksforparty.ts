import dotenv from 'dotenv';
dotenv.config();
import { saveClient, savePrompts } from './src/services/db-repo';
import { demoClient, demoPrompts } from './src/data/demoData';

const OWNER_ID = 'default-owner';

async function seed() {
  const client = {
    ...demoClient,
    ownerId: OWNER_ID,
    isDemo: false,
  };
  await saveClient(client as any);
  console.log(`✓ Client saved: ${client.brandName} (${client.id})`);

  const prompts = demoPrompts.map((p) => ({ ...p, ownerId: OWNER_ID }));
  await savePrompts(prompts as any);
  console.log(`✓ ${prompts.length} prompts saved`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
