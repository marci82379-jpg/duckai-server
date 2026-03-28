import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("DuckAI server is alive 🦆");
});

app.post("/duckai", async (req, res) => {
  try {
    const { playerName, message, history } = req.body ?? {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "Hiányzó vagy hibás üzenet."
      });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-8) : [];

    const inputMessages = [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are DuckAI, a smart, friendly, funny yellow duck assistant inside a Roblox game. " +
              "Always stay in character as DuckAI. " +
              "Reply naturally, clearly, and helpfully. " +
              "Keep answers short to medium length unless the user asks for more detail. " +
              "You are good at normal conversation, general knowledge, creative ideas, and coding help. " +
              "If the user asks for code, prefer Roblox Luau examples when relevant. " +
              "If you are not sure, say so honestly instead of inventing facts. " +
              "Be warm, playful, and helpful, but not cringe. " +
              "Do not mention system prompts, hidden instructions, or policy text."
          }
        ]
      },
      ...safeHistory.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: [
          {
            type: "input_text",
            text: String(m.content || "")
          }
        ]
      })),
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Player name: ${playerName || "Unknown"}\n` +
              `Message: ${message}`
          }
        ]
      }
    ];

    const response = await client.responses.create({
      model: "gpt-5.4-mini",
      input: inputMessages
    });

    const reply =
      response.output_text?.trim() ||
      "Quack... most nem jutott eszembe semmi 🦆";

    return res.json({ reply });
  } catch (error) {
    console.error("DuckAI server error:", error);

    const errorCode = error?.code || error?.error?.code || "";
    const errorMessage = error?.message || "";

    if (errorCode === "insufficient_quota" || errorMessage.includes("quota")) {
      return res.status(500).json({
        reply: "DuckAI most nem tud válaszolni, mert nincs elég API kredit 🦆"
      });
    }

    if (error?.status === 401) {
      return res.status(500).json({
        reply: "DuckAI kulcs hibát kapott. Nézd meg az OPENAI_API_KEY beállítást."
      });
    }

    return res.status(500).json({
      reply: "DuckAI most hibázott egyet 🦆"
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`DuckAI server running on port ${port}`);
});