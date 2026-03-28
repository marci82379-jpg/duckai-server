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
      return res.status(400).json({ reply: "Hiányzó üzenet." });
    }

    const safeHistory = Array.isArray(history) ? history.slice(-12) : [];

    const inputMessages = [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are DuckAI, a smart, friendly yellow duck assistant inside a Roblox game."
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
            text: message
          }
        ]
      }
    ];

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: inputMessages
    });

    const reply =
      response.output_text?.trim() ||
      "Quack... most nem jutott eszembe semmi 🦆";

    return res.json({ reply });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      reply: "DuckAI most hibázott 🦆"
    });
  }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("DuckAI server running on port " + port);
});