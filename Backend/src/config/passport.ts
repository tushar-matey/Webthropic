import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, type Profile as GitHubProfile } from 'passport-github2';
import { User, type IUserDocument } from '../models/User.js';

export function configurePassport(): void {
  passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
    done(null, user.id || user._id?.toString());
  });

  passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user.toSanitized());
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackUrl =
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: googleCallbackUrl,
          passReqToCallback: true
        },
        async (req: any, _accessToken: string, _refreshToken: string, profile: GoogleProfile, done: any) => {
          try {
            const providerAccountId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const avatar = profile.photos?.[0]?.value || null;
            const name = profile.displayName || profile.name?.givenName || 'Google User';

            // 1. Check if user already exists with this OAuth account
            let user = await User.findOne({
              'oauthAccounts.provider': 'google',
              'oauthAccounts.providerAccountId': providerAccountId
            });

            if (user) {
              user.lastLoginAt = new Date();
              if (avatar && !user.avatar) user.avatar = avatar;
              await user.save();
              return done(null, user.toSanitized());
            }

            // 2. If user is currently logged in, link this OAuth account
            const currentUserId = req.session?.userId || (req.user as any)?.id;
            if (currentUserId) {
              const existingUser = await User.findById(currentUserId);
              if (existingUser) {
                existingUser.oauthAccounts.push({
                  provider: 'google',
                  providerAccountId,
                  email: email || null,
                  avatar: avatar || null
                });
                if (avatar && !existingUser.avatar) existingUser.avatar = avatar;
                existingUser.lastLoginAt = new Date();
                await existingUser.save();
                return done(null, existingUser.toSanitized());
              }
            }

            // 3. If email exists, link safely
            if (email) {
              const existingEmailUser = await User.findOne({ email });
              if (existingEmailUser) {
                existingEmailUser.oauthAccounts.push({
                  provider: 'google',
                  providerAccountId,
                  email,
                  avatar: avatar || null
                });
                if (!existingEmailUser.emailVerified) existingEmailUser.emailVerified = true;
                if (avatar && !existingEmailUser.avatar) existingEmailUser.avatar = avatar;
                existingEmailUser.lastLoginAt = new Date();
                await existingEmailUser.save();
                return done(null, existingEmailUser.toSanitized());
              }
            }

            // 4. Create new user with Google OAuth
            user = await User.create({
              name,
              email: email || `${providerAccountId}@google.oauth.webthropic.local`,
              avatar,
              emailVerified: true,
              provider: 'google',
              oauthAccounts: [
                {
                  provider: 'google',
                  providerAccountId,
                  email: email || null,
                  avatar: avatar || null
                }
              ],
              lastLoginAt: new Date()
            });

            return done(null, user.toSanitized());
          } catch (err) {
            return done(err, false);
          }
        }
      )
    );
    console.log('[Passport] Google OAuth strategy registered');
  } else {
    console.log('[Passport] Google OAuth strategy skipped (GOOGLE_CLIENT_ID not set)');
  }

  // GitHub OAuth Strategy
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const githubCallbackUrl =
    process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback';

  if (githubClientId && githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: githubCallbackUrl,
          passReqToCallback: true,
          scope: ['user:email']
        },
        async (req: any, _accessToken: string, _refreshToken: string, profile: GitHubProfile, done: any) => {
          try {
            const providerAccountId = profile.id;
            const email = profile.emails?.[0]?.value?.toLowerCase();
            const avatar = profile.photos?.[0]?.value || (profile as any)._json?.avatar_url || null;
            const name = profile.displayName || profile.username || 'GitHub User';

            // 1. Check if user already exists with this OAuth account
            let user = await User.findOne({
              'oauthAccounts.provider': 'github',
              'oauthAccounts.providerAccountId': providerAccountId
            });

            if (user) {
              user.lastLoginAt = new Date();
              if (avatar && !user.avatar) user.avatar = avatar;
              await user.save();
              return done(null, user.toSanitized());
            }

            // 2. If user is currently logged in, link this OAuth account
            const currentUserId = req.session?.userId || (req.user as any)?.id;
            if (currentUserId) {
              const existingUser = await User.findById(currentUserId);
              if (existingUser) {
                existingUser.oauthAccounts.push({
                  provider: 'github',
                  providerAccountId,
                  email: email || null,
                  avatar: avatar || null
                });
                if (avatar && !existingUser.avatar) existingUser.avatar = avatar;
                existingUser.lastLoginAt = new Date();
                await existingUser.save();
                return done(null, existingUser.toSanitized());
              }
            }

            // 3. If email exists, link safely
            if (email) {
              const existingEmailUser = await User.findOne({ email });
              if (existingEmailUser) {
                existingEmailUser.oauthAccounts.push({
                  provider: 'github',
                  providerAccountId,
                  email,
                  avatar: avatar || null
                });
                if (!existingEmailUser.emailVerified) existingEmailUser.emailVerified = true;
                if (avatar && !existingEmailUser.avatar) existingEmailUser.avatar = avatar;
                existingEmailUser.lastLoginAt = new Date();
                await existingEmailUser.save();
                return done(null, existingEmailUser.toSanitized());
              }
            }

            // 4. Create new user with GitHub OAuth
            user = await User.create({
              name,
              email: email || `${providerAccountId}@github.oauth.webthropic.local`,
              avatar,
              emailVerified: true,
              provider: 'github',
              oauthAccounts: [
                {
                  provider: 'github',
                  providerAccountId,
                  email: email || null,
                  avatar: avatar || null
                }
              ],
              lastLoginAt: new Date()
            });

            return done(null, user.toSanitized());
          } catch (err) {
            return done(err, false);
          }
        }
      )
    );
    console.log('[Passport] GitHub OAuth strategy registered');
  } else {
    console.log('[Passport] GitHub OAuth strategy skipped (GITHUB_CLIENT_ID not set)');
  }
}
