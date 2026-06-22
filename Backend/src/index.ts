import dotenv from "dotenv";
dotenv.config();
import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import type { TextBlock } from "@anthropic-ai/sdk/resources";

import { BASE_PROMPT, getSystemPrompt  } from "./prompts.js";
import { basePrompt as reactPrompt } from "./defaults/react.js";
import { basePrompt as nodePrompt } from "./defaults/node.js";



const client = new Anthropic();
const app= express();

app.listen(3000);
app.use(express.json());


app.post('/template',async(req,res)=>{
    const prompt=req.body.prompt;
    const message = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 200,
        messages: [
            {
            role: "user",
            content: prompt
            }
        ],
        system: "return either react or node based on what do you think this project should be . only return a single word either 'react' or 'node'. do not return anything extra."
    });
    const response =
    message.content[0]?.type === "text"
        ? message.content[0].text
        : "";
    if(response=="react"){
        res.json({
            prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactPrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [reactPrompt]
        })
        return;
    }
    if(response=="node"){
        res.json({
            prompts: [`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
            uiPrompts: [nodePrompt]
        })
        return;
    }
    res.status(403).json({message:"irrelevent request"});
    return;

    
});


app.post("/chat",async(req,res)=>{
    const message=req.body.messages;
    const stream = client.messages.stream({
    model: "claude-opus-4-8",
    messages:message,
    max_tokens: 256,
    system:getSystemPrompt()
    });

    for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        process.stdout.write(event.delta.text);
    }
    }
})


// async function main() {
//     const stream = client.messages.stream({
//     model: "claude-opus-4-8",
//     messages: [{ role: "user", content: "steps to create a simple todo app" }],
//     max_tokens: 256,
//     });

//     for await (const event of stream) {
//     if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
//         process.stdout.write(event.delta.text);
//     }
//     }
// }

// main();