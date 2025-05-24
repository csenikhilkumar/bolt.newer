import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from "express";
import { BasePrompt } from "./defaults/node.js";
import { BasePrompt1 } from "./defaults/react.js";
import { BASE_PROMPT, getSystemPrompt} from "./prompts.js";



dotenv.config();
const app = express();
app.use(express.json()); // 🔧 Middleware to parse JSON body



const key = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(key);

// ✅ Declare model once
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



app.post("/template", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const result = await model.generateContentStream({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 200,
      },
    });

    let fullResponse = "";
    for await (const chunk of result.stream) {
      fullResponse += chunk.text();
    }



    if (fullResponse.includes("react")) {
      res.json({
        prompts: [BASE_PROMPT, `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${BasePrompt1}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompt:[BasePrompt1]
      });
      return;
    }
    if (fullResponse.includes("node")) {
      res.json({
        prompts: [BasePrompt,`Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${BasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`],
        uiPrompt:[BasePrompt]
      });
      return;
    }

    // Always send a fallback response
    res.status(400).json({ error: "Unrecognized model response", modelResponse: fullResponse });

  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).send("Error generating content.");
  }
});





app.post("/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    // Define the system prompt
   

    // Create system instruction as the first user message
    const systemMessage = {
      role: "user",
      parts: [{ text: `The following commands are required and must be included:
- npm install
- npm run dev
- npm run build

Also include how to install dependencies like:
- tailwindcss
- eslint
- typescript
- @vitejs/plugin-react

Do not skip any of these commands. They are mandatory.

      Provide the content for each file clearly, using markdown code blocks.

      Mandatory files :
      - .gitignore
      - package.json
      - index.html
      - postcss.config.js
      - eslint.config.js
      - src/App.tsx
      - src/main.tsx
      - src/index.css
      - tsconfig.json
      - tsconfig.app.json
      - tsconfig.node.json
      - vite.config.ts

     
      For each file, start with its full path (e.g., '.gitignore') followed by a markdown code block.
      Example:

      .gitignore
      \\\
      /node_modules
      /dist
      \\\

      package.json
      \\\json
      {
        "name": "my-project",
        "version": "0.0.0"
      }
      \\\ ${getSystemPrompt} ` }],
    };

    // Convert user messages
    const userMessages = messages.map((msg: any) => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // Call Gemini
    const result = await model.generateContentStream({
      contents: [systemMessage, ...userMessages],
      generationConfig: {
        maxOutputTokens: 8000
      }
    });

    // Stream result
    let fullResponse = "";
    for await (const chunk of result.stream) {
      fullResponse += chunk.text();
    }
 

    res.json({
      response: fullResponse
    });

  } catch (error) {
    console.error("Error in /chat:", error);
    res.status(500).send("Error generating response");
  }
});





// ✅ Start Express server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
