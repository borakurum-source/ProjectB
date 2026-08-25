import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, execute } from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  isActive: boolean;
}

export interface AuthToken {
  token: string;
  user: User;
  expiresIn: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

// Create JWT token
export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await queryOne<any>(
    'SELECT id, email, displayName, isActive FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return result ? { ...result, email: result.email.toLowerCase() } : null;
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  const result = await queryOne<any>(
    'SELECT id, email, displayName, isActive FROM users WHERE id = $1',
    [id]
  );
  return result || null;
}

// Register new user
export async function registerUser(email: string, password: string, displayName?: string): Promise<User> {
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const passwordHash = await hashPassword(password);

  await execute(
    `INSERT INTO users (id, email, passwordHash, displayName, isActive)
     VALUES ($1, $2, $3, $4, true)`,
    [id, email.toLowerCase(), passwordHash, displayName || email.split('@')[0]]
  );

  return {
    id,
    email: email.toLowerCase(),
    displayName: displayName || email.split('@')[0],
    isActive: true,
  };
}

// Login user
export async function loginUser(email: string, password: string): Promise<AuthToken> {
  const result = await queryOne<any>(
    'SELECT id, email, displayName, isActive, passwordHash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (!result || !result.isActive) {
    throw new Error('Invalid email or password');
  }

  const passwordMatch = await verifyPassword(password, result.passwordHash);
  if (!passwordMatch) {
    throw new Error('Invalid email or password');
  }

  const token = createToken(result.id);
  return {
    token,
    user: {
      id: result.id,
      email: result.email,
      displayName: result.displayName,
      isActive: result.isActive,
    },
    expiresIn: JWT_EXPIRY,
  };
}

// Middleware to extract user from token
export function extractUserFromToken(token: string): string | null {
  const payload = verifyToken(token);
  return payload?.userId || null;
}
