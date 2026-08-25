import { Router, Request, Response, NextFunction } from 'express';
import * as auth from './auth';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const authToken = await auth.loginUser(email, password);
    res.json(authToken);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed' });
  }
});

// Register endpoint (disabled by default, enable for setup only)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user already exists
    const existing = await auth.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const user = await auth.registerUser(email, password, displayName);
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);
    const userId = auth.extractUserFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await auth.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify token
router.post('/verify', (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const userId = auth.extractUserFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ valid: true, userId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
