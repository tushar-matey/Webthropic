import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import Anthropic from '@anthropic-ai/sdk';

import { connectDatabase } from './config/database.js';
import { getSessionMiddleware } from './config/session.js';
import { configurePassport } from './config/passport.js';
import { authRouter } from './routes/auth.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { optionalAuth } from './middleware/auth.middleware.js';

import { BASE_PROMPT, getSystemPrompt } from './prompts.js';
import { basePrompt as reactPrompt } from './defaults/react.js';
import { basePrompt as nodePrompt } from './defaults/node.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Trust proxy for production environments (behind Nginx, Render, Heroku, etc.)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers with Helmet
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS configuration with credentials support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or matching client url
      if (!origin || origin === CLIENT_URL || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Body parsing with safe size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session and Passport initialization
app.use(getSessionMiddleware());
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// Anthropic Claude client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// AI Template Generation Endpoint (Preserved Webthropic functionality)
app.post('/template', optionalAuth, async (req, res, next) => {
  try {
    console.log('[AI] Received request for template generation');
    const prompt = req.body.prompt;

    let response = 'react';

    // If Anthropic API key is available, classify the framework; otherwise default to react
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.startsWith('sk-ant')) {
      try {
        const message = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          system:
            "Return either 'react' or 'node' based on what you think this project should be. Only return a single word either 'react' or 'node'. Do not return anything extra."
        });

        const firstBlock = message.content[0];
        if (firstBlock && firstBlock.type === 'text') {
          response = firstBlock.text.trim().toLowerCase();
        }
      } catch (err) {
        console.warn('[AI] Classification error, defaulting to react:', err);
        response = 'react';
      }
    }

    if (response.includes('react')) {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactPrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`
        ],
        uiPrompts: [reactPrompt]
      });
      return;
    }

    if (response.includes('node')) {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`
        ],
        uiPrompts: [nodePrompt]
      });
      return;
    }

    res.status(403).json({ message: 'Irrelevant request' });
  } catch (error) {
    next(error);
  }
});

// AI Chat Generation Endpoint (Preserved Webthropic functionality)
app.post('/chat', optionalAuth, async (req, res, next) => {
  try {
    console.log('[AI] Received request for chat');
    const messages = req.body.messages;

    if (!process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant')) {
      res.status(400).json({
        response: 'Anthropic API key is not configured. Please set ANTHROPIC_API_KEY in .env.'
      });
      return;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: messages,
      system: getSystemPrompt()
    });

    const firstBlock = response.content[0];
    const responseText = firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';

    res.json({ response: responseText });
  } catch (error) {
    next(error);
  }
});

// Global Error Handler
app.use(errorHandler);

// Start server after connecting to database
async function bootstrap() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`[Webthropic Backend] Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Bootstrap] Fatal startup error:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;
