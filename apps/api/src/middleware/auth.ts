import type { Request, Response, NextFunction } from 'express';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ykzjbxtjzxmpuwpuyvzr.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrempieHRqenhtcHV3cHV5dnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjA1NDQsImV4cCI6MjEwNDA5NjU0NH0.j7v8hmWSN8fcqSQa2pAh7_l8YQ8PUJn-kshuZfUwJQw';

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Validates the caller's Supabase session access token server-side.
 * Rejects unauthenticated or malformed requests with 401 Unauthorized.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: An active authentication session is required to perform this action.',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: 'Unauthorized: Authentication token is missing.',
    });
    return;
  }

  // Handle local test tokens for automated test suite
  if (process.env.NODE_ENV === 'test' && token.startsWith('test-token-')) {
    const testUserId = token.replace('test-token-', '');
    req.user = {
      id: testUserId,
      email: `${testUserId}@supplyguard.internal`,
    };
    next();
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      res.status(401).json({
        error: 'Unauthorized: The provided authentication session has expired or is invalid.',
      });
      return;
    }

    const userData = (await response.json()) as { id: string; email?: string };
    if (!userData || !userData.id) {
      res.status(401).json({
        error: 'Unauthorized: Could not resolve authenticated user identity.',
      });
      return;
    }

    req.user = {
      id: userData.id,
      email: userData.email,
    };

    next();
  } catch (err) {
    console.error('[AuthMiddleware] Error validating token with Supabase:', err);
    res.status(500).json({
      error: 'Authentication verification service temporarily unavailable.',
    });
  }
}
