import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import type { AuthPayload } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function parseToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export type AuthedRequest = Request & { user?: AuthPayload };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const payload = parseToken(auth.slice(7));
  if (!payload) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  req.user = payload;
  next();
}
