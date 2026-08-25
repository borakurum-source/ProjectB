import dotenv from 'dotenv';
import * as auth from './src/services/auth';

dotenv.config();

async function setupUser() {
  try {
    const email = process.env.SETUP_USER_EMAIL;
    const password = process.env.SETUP_USER_PASSWORD;
    const displayName = process.env.SETUP_USER_DISPLAY_NAME || email?.split('@')[0];

    if (!email || !password) {
      console.error('SETUP_USER_EMAIL and SETUP_USER_PASSWORD environment variables are required');
      process.exit(1);
    }

    console.log(`Creating user: ${email}...`);

    // Check if user already exists
    const existing = await auth.getUserByEmail(email);
    if (existing) {
      console.log('✓ User already exists');
      return;
    }

    // Create user
    const user = await auth.registerUser(email, password, displayName);
    console.log('✓ User created successfully');
    console.log(`  Email: ${user.email}`);
    console.log(`  Display Name: ${user.displayName}`);
    console.log(`  ID: ${user.id}`);

    // Test login
    console.log('\nTesting login...');
    const loginResult = await auth.loginUser(email, password);
    console.log('✓ Login successful');
    console.log(`  Token: ${loginResult.token.slice(0, 20)}...`);
    console.log(`  Expires In: ${loginResult.expiresIn}`);
  } catch (err: any) {
    console.error('✗ Setup failed:', err.message);
    process.exit(1);
  }
}

setupUser().then(() => {
  console.log('\n✓ User setup complete!');
  process.exit(0);
});
