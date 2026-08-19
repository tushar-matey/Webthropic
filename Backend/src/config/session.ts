import session, { type SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';

export function getSessionMiddleware(): ReturnType<typeof session> {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/webthropic';
  const sessionSecret = process.env.SESSION_SECRET || 'webthropic_default_development_session_secret_32_chars';

  const sessionOptions: SessionOptions = {
    name: 'webthropic.sid',
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: 'sessions',
      ttl: 30 * 24 * 60 * 60, // 30 days in seconds
      autoRemove: 'native',
      touchAfter: 24 * 3600 // touch only once in 24 hours unless session data changes
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days in ms
    }
  };

  return session(sessionOptions);
}
