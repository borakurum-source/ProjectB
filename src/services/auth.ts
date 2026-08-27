import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db as sqlDb } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'rag-signal-neon-secure-key-2026';
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

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const rows = await sqlDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()));
    if (rows.length > 0) {
      const u = rows[0];
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        isActive: u.isActive ?? true,
      };
    }
  } catch (err) {
    console.warn('[Neon getUserByEmail] Error querying user:', err);
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const rows = await sqlDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));
    if (rows.length > 0) {
      const u = rows[0];
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        isActive: u.isActive ?? true,
      };
    }
  } catch (err) {
    console.warn('[Neon getUserById] Error querying user:', err);
  }
  return null;
}

export async function registerUser(email: string, password: string, displayName?: string): Promise<User> {
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const passwordHash = await hashPassword(password);
  const normalizedEmail = email.toLowerCase().trim();
  const name = displayName || normalizedEmail.split('@')[0];

  try {
    await sqlDb.insert(schema.users).values({
      id,
      email: normalizedEmail,
      passwordHash,
      displayName: name,
      isActive: true,
      createdAt: new Date(),
    });
  } catch (err) {
    console.warn('[Neon registerUser] Error inserting user:', err);
  }

  return {
    id,
    email: normalizedEmail,
    displayName: name,
    isActive: true,
  };
}

export async function loginUser(email: string, password: string): Promise<AuthToken> {
  const normalizedEmail = email.toLowerCase().trim();
  let userRow: typeof schema.users.$inferSelect | null = null;

  try {
    const rows = await sqlDb
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail));
    if (rows.length > 0) {
      userRow = rows[0];
    }
  } catch (err) {
    console.warn('[Neon loginUser] Error querying user for login:', err);
  }

  if (!userRow) {
    throw new Error('Invalid email or password');
  }

  if (userRow.isActive === false) {
    throw new Error('Account is inactive. Please contact support.');
  }

  if (userRow.passwordHash) {
    const passwordMatch = await verifyPassword(password, userRow.passwordHash);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }
  }

  const token = createToken(userRow.id);
  return {
    token,
    user: {
      id: userRow.id,
      email: userRow.email,
      displayName: userRow.displayName || userRow.email.split('@')[0],
      isActive: userRow.isActive ?? true,
    },
    expiresIn: JWT_EXPIRY,
  };
}

export function extractUserFromToken(token: string): string | null {
  const payload = verifyToken(token);
  return payload?.userId || null;
}
