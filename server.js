import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const userProfiles = {};

function getUserProfile(playerName) {
  const key = String(playerName || "Unknown");
  if (!userProfiles[key]) {
    userProfiles[key] = {
      preferredStyle: "friendly",
      favoriteTopics: [],
      shortMemory: [],
      lastMood: "",
      lastMode: "normal"
    };
  }
  return userProfiles[key];
}

function updateProfileFromMessage(profile, message) {
  const text = String(message || "").toLowerCase();

  if (text.includes("roviden") || text.includes("short")) {
    profile.preferredStyle = "short";
  }
  if (text.includes("reszletesen") || text.includes("detailed")) {
    profile.preferredStyle = "detailed";
  }
  if (text.includes("vicces") || text.includes("funny")) {
    profile.preferredStyle = "funny";
  }
  if (text.includes("kod") || text.includes("script") || text.includes("luau") || text.includes("roblox")) {
    profile.lastMode = "developer";
    if (!profile.favoriteTopics.includes("Roblox scripting")) {
      profile.favoriteTopics.push("Roblox scripting");
    }
  }
  if (text.includes("szomoru") || text.includes("sad")) {
    profile.lastMood = "sad";
  }
  if (text.includes("boldog") || text.includes("happy")) {
    profile.lastMood = "happy";
  }

  profile.shortMemory.push(message);
  while (profile.shortMemory.length > 6) {
    profile.shortMemory.shift();
  }
  while (profile.favoriteTopics.length > 6) {
    profile.favoriteTopics.shift();
  }
}

function buildSystemPrompt(playerName, profile) {
  const styleRule =
    profile.preferredStyle === "short"
      ? "Keep answers short and clean."
      : profile.preferredStyle === "detailed"
      ? "Give fuller and more detailed answers."
      : profile.preferredStyle === "funny"
      ? "Be slightly funnier and more playful."
      : "Keep answers medium length and natural.";

  const moodRule =
    profile.lastMood === "sad"
      ? "Be a bit more gentle and supportive."
      : profile.lastMood === "happy"
      ? "Match the user's positive energy a little."
      : "Stay balanced and warm.";

  const modeRule =
    profile.lastMode === "developer"
      ? "If code is requested, prefer Roblox Luau examples when relevant."
      : "Help with general questions naturally.";

  const topicRule =
    profile.favoriteTopics.length > 0
      ? `The user often likes these topics: ${profile.favoriteTopics.join(", ")}.`
      : "No strong favorite topics are known yet.";

  const memoryRule =
    profile.shortMemory.length > 0
      ? `Recent user tendencies or statements: ${profile.shortMemory.join(" | ")}`
      : "No short memory yet.";

  return (
    `You are DuckAI, a smart, friendly yellow duck assistant inside a Roblox game. ` +
    `Always stay in character as DuckAI. ` +
    `You are helpful, natural, slightly playful, and sometimes gently duck-themed, but not over the top. ` +
    `Address the player by name sometimes: ${playerName || "Unknown"}. ` +
    `${styleRule} ${moodRule} ${modeRule} ` +
    `Have slightly better initiative: if the conversation stalls, ask a useful follow-up or suggest a next step. ` +
    `Show better situational awareness: distinguish between casual chat, coding help, planning, and emotional support. ` +
    `If unsure, say so honestly. ` +
    `${topicRule} ${memoryRule}`
  );
}

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

    const safeHistory = Array.isArray(history) ? history.slice(-12) : [];
    const profile = getUserProfile(playerName);
    updateProfileFromMessage(profile, message);

    const inputMessages = [
      {
        role: "system",
        content: buildSystemPrompt(playerName, profile)
      },
      ...safeHistory.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || "")
      })),
      {
        role: "user",
        content:
          `Player name: ${playerName || "Unknown"}\n` +
          `Message: ${message}`
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