import cluster from "node:cluster";
import os from "node:os";
import dotenv from "dotenv";
dotenv.config();

import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import cors from "cors";

import { BASE_PROMPT, getSystemPrompt } from "./prompts.js";
import { basePrompt as reactPrompt } from "./defaults/react.js";
import { basePrompt as nodePrompt } from "./defaults/node.js";

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} running, forking ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (${signal || code}), restarting`);
    cluster.fork(); // keep the pool full
  });
} else {
  startServer();
}

function startServer() {
  const client = new Anthropic();
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.post("/template", async (req, res) => {
    console.log(`[worker ${process.pid}] template request`);
    const response = "react";

    if (response.trim().toLowerCase() === "react") {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactPrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactPrompt],
      });
      return;
    }
    if (response.trim().toLowerCase() === "node") {
      res.json({
        prompts: [
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodePrompt],
      });
      return;
    }
    res.status(403).json({ message: "irrelevent request" });
  });

  app.post("/chat", async (req, res) => {
    console.log(`[worker ${process.pid}] chat request`);
    const message = req.body.messages;
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: message,
      system: getSystemPrompt(),
    });
    const responseText =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    res.json({ response: responseText });
  });

  app.listen(3000, () => {
    console.log(`Worker ${process.pid} listening on port 3000`);
  });
}