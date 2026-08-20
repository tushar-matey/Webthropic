import dotenv from 'dotenv';
dotenv.config();

import cluster from 'node:cluster';
import os from 'node:os';
import type { Server } from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import Anthropic from '@anthropic-ai/sdk';

import { connectDatabase, disconnectDatabase } from './config/database.js';
import { getSessionMiddleware } from './config/session.js';
import { configurePassport } from './config/passport.js';
import { authRouter } from './routes/auth.routes.js';
import { projectRouter } from './routes/project.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { optionalAuth } from './middleware/auth.middleware.js';

import { BASE_PROMPT, getSystemPrompt } from './prompts.js';
import { basePrompt as reactPrompt } from './defaults/react.js';
import { basePrompt as nodePrompt } from './defaults/node.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '15000', 10);

// Determine clustering mode: defaults to single-process (false) for container safety (e.g. Render/Heroku/K8s)
const isClusterMode =
  process.env.CLUSTER_MODE === 'true' ||
  (process.env.WEB_CONCURRENCY !== undefined && parseInt(process.env.WEB_CONCURRENCY, 10) > 1);

const defaultConcurrency = os.cpus().length || 1;
const rawConcurrency = process.env.WEB_CONCURRENCY || process.env.CLUSTER_WORKERS;
const numWorkers = rawConcurrency ? Math.max(1, parseInt(rawConcurrency, 10)) : defaultConcurrency;

// ============================================================================
// 1. Primary Process Handler (Cluster Mode)
// ============================================================================
if (isClusterMode && cluster.isPrimary) {
  console.log(`[Cluster Primary] Master process PID ${process.pid} is running`);
  console.log(`[Cluster Primary] Initializing cluster with ${numWorkers} worker processes`);

  // Track worker restarts to prevent rapid crash looping
  const restartTimes: number[] = [];
  const MAX_RESTARTS_PER_MINUTE = 10;
  const restartBackoffs = new Map<number, number>();

  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork({ WORKER_INDEX: (i + 1).toString() });
    console.log(`[Cluster Primary] Spawned worker #${i + 1} (PID: ${worker.process.pid})`);
  }

  cluster.on('online', (worker) => {
    console.log(`[Cluster Primary] Worker ${worker.process.pid} is now online and ready`);
  });

  cluster.on('exit', (worker, code, signal) => {
    const isCleanExit = worker.exitedAfterDisconnect || code === 0;

    if (isCleanExit) {
      console.log(`[Cluster Primary] Worker ${worker.process.pid} exited cleanly (${signal || code})`);
      return;
    }

    console.warn(`[Cluster Primary] Worker ${worker.process.pid} died unexpectedly (code: ${code}, signal: ${signal})`);

    const now = Date.now();
    restartTimes.push(now);
    // Remove restarts older than 60s
    while (restartTimes.length > 0 && typeof restartTimes[0] === 'number' && now - restartTimes[0] > 60000) {
      restartTimes.shift();
    }

    if (restartTimes.length > MAX_RESTARTS_PER_MINUTE) {
      console.error(
        `[Cluster Primary] CRITICAL: Worker restart rate exceeded ${MAX_RESTARTS_PER_MINUTE} crashes/min. Pausing worker restarts to protect system resources.`
      );
      return;
    }

    // Exponential backoff for worker restart
    const previousBackoff = restartBackoffs.get(worker.id) || 100;
    const nextBackoff = Math.min(previousBackoff * 2, 5000);
    restartBackoffs.set(worker.id, nextBackoff);

    console.log(`[Cluster Primary] Restarting worker in ${nextBackoff}ms...`);
    setTimeout(() => {
      const newWorker = cluster.fork();
      console.log(`[Cluster Primary] Replaced dead worker with new worker PID ${newWorker.process.pid}`);
    }, nextBackoff);
  });

  // Handle Primary process termination (SIGINT / SIGTERM)
  const shutdownPrimary = (signal: string) => {
    console.log(`\n[Cluster Primary] Received ${signal}. Initiating graceful shutdown for all workers...`);

    for (const id in cluster.workers) {
      const worker = cluster.workers[id];
      if (worker && !worker.isDead()) {
        worker.process.kill(signal as NodeJS.Signals);
      }
    }

    // Set timeout to force kill if workers don't exit in time
    const forceKillTimer = setTimeout(() => {
      console.error(`[Cluster Primary] Shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms) reached. Forcefully killing remaining workers.`);
      for (const id in cluster.workers) {
        const worker = cluster.workers[id];
        if (worker && !worker.isDead()) {
          worker.kill('SIGKILL');
        }
      }
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    forceKillTimer.unref();

    // Check if all workers exited
    const checkInterval = setInterval(() => {
      const activeWorkers = Object.values(cluster.workers || {}).filter((w) => w && !w.isDead());
      if (activeWorkers.length === 0) {
        clearInterval(checkInterval);
        clearTimeout(forceKillTimer);
        console.log('[Cluster Primary] All workers exited cleanly. Primary terminating.');
        process.exit(0);
      }
    }, 200);

    checkInterval.unref();
  };

  process.on('SIGINT', () => shutdownPrimary('SIGINT'));
  process.on('SIGTERM', () => shutdownPrimary('SIGTERM'));
} else {
  // ============================================================================
  // 2. Worker Process / Single Process Server Application
  // ============================================================================
  startApplicationServer();
}

function startApplicationServer() {
  const app = express();
  let server: Server | null = null;
  let isShuttingDown = false;

  // Trust proxy for production environments (behind Nginx, Render, Heroku, etc.)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Graceful shutdown barrier: reject new incoming connections during shutdown
  app.use((req, res, next) => {
    if (isShuttingDown) {
      res.setHeader('Connection', 'close');
      res.status(503).json({
        success: false,
        message: 'Server is currently shutting down. Please retry shortly.'
      });
      return;
    }
    next();
  });

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

  // Session and Passport initialization (uses shared cluster-safe MongoStore)
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
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      cluster: isClusterMode,
      workerId: cluster.worker?.id || null
    });
  });

  // AI Template Generation Endpoint (Preserved Webthropic functionality)
  app.post('/template', optionalAuth, async (req, res, next) => {
    try {
      console.log(`[AI] [PID ${process.pid}] Received request for template generation`);
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
      console.log(`[AI] [PID ${process.pid}] Received request for chat`);
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

      server = app.listen(PORT, () => {
        const workerLabel = cluster.isWorker
          ? `Worker #${process.env.WORKER_INDEX || cluster.worker?.id} (PID: ${process.pid})`
          : `Single Process (PID: ${process.pid})`;
        console.log(`[Webthropic Backend] ${workerLabel} running on http://localhost:${PORT}`);
      });

      // Graceful shutdown handler per worker / single-process
      const shutdownWorker = async (signal: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        const workerLabel = cluster.isWorker ? `Worker PID ${process.pid}` : `Process PID ${process.pid}`;
        console.log(`[Webthropic Backend] ${workerLabel} received ${signal}. Draining connections...`);

        if (server) {
          server.close(async (err) => {
            if (err) {
              console.error(`[Webthropic Backend] ${workerLabel} error during server close:`, err);
            } else {
              console.log(`[Webthropic Backend] ${workerLabel} closed HTTP listener cleanly.`);
            }

            try {
              await disconnectDatabase();
              console.log(`[Webthropic Backend] ${workerLabel} disconnected from MongoDB.`);
            } catch (dbErr) {
              console.error(`[Webthropic Backend] ${workerLabel} error disconnecting DB:`, dbErr);
            }

            process.exit(0);
          });
        } else {
          await disconnectDatabase();
          process.exit(0);
        }

        // Safety force-exit timer if in-flight requests (like AI /chat) take too long
        const forceExitTimer = setTimeout(() => {
          console.error(`[Webthropic Backend] ${workerLabel} force exit after ${SHUTDOWN_TIMEOUT_MS}ms timeout.`);
          process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);

        forceExitTimer.unref();
      };

      process.on('SIGTERM', () => shutdownWorker('SIGTERM'));
      process.on('SIGINT', () => shutdownWorker('SIGINT'));

      if (cluster.isWorker) {
        process.on('disconnect', () => {
          console.log(`[Webthropic Backend] Worker PID ${process.pid} disconnected from primary.`);
          shutdownWorker('disconnect');
        });
      }
    } catch (error) {
      console.error('[Bootstrap] Fatal startup error:', error);
      process.exit(1);
    }
  }

  bootstrap();
}

export default startApplicationServer;
