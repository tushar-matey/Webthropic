import type { SanitizedUser } from './user.types.js';

declare global {
  namespace Express {
    interface User extends SanitizedUser {}
    interface Request {
      user?: SanitizedUser;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    passport?: {
      user?: string;
    };
  }
}

export {};
