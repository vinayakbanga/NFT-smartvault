// ─── Hugging Face AI Utility ─────────────────────────────────────────

const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || "";

/**
 * Helper to check if token exists
 */
function checkToken() {
  if (!HF_TOKEN) {
    throw new Error("Hugging Face token not found. Add VITE_HF_TOKEN to your .env file.");
  }
}

/**
 * 1. AI Designer: Generate an image from a text prompt.
 * Uses the new Hugging Face router endpoint for robust image generation.
 */
export async function generateStampImage(prompt) {
  checkToken();
  
  const data = {
    prompt: prompt,
    model: "stabilityai/stable-diffusion-xl-base-1.0",
    response_format: "b64_json"
  };

  const response = await fetch(
    "https://router.huggingface.co/nscale/v1/images/generations",
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("HF Router error:", errText);
    throw new Error("AI generation failed or is currently busy.");
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || json.error);
  }

  // The new router returns JSON with base64 data because we requested b64_json
  const base64Str = json.data[0].b64_json;
  
  // Convert base64 straight to an Image Blob using browser fetch
  const res = await fetch(`data:image/jpeg;base64,${base64Str}`);
  const blob = await res.blob();
  
  return new File([blob], "ai-stamp.jpg", { type: "image/jpeg" });
}

/**
 * 2. AI Historian: Generate a historical description for a stamp.
 */
export async function generateStampDescription(name, origin) {
  checkToken();
  
  const prompt = `Write a short, engaging historical description (2-3 sentences max) for a rare postage stamp. 
Name of the stamp: ${name}
Origin/Era: ${origin}
Format it as a simple paragraph. No introductions, no bullet points, just the story.`;

  const data = {
    model: "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 150
  };

  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("HF Router error:", errText);
    throw new Error(`AI Historian Error: ${errText}`);
  }

  const result = await response.json();
  if (result.error) throw new Error(result.error);

  let generatedText = result.choices[0].message.content.trim();
  // Clean up any weird quotes or formatting
  generatedText = generatedText.replace(/^["']|["']$/g, '');
  return generatedText;
}

/**
 * 3. AI Scorer: Analyze metadata and suggest rarity.
 */
export async function analyzeStampRarity(name, origin) {
  checkToken();
  
  const prompt = `Analyze this postage stamp and classify its rarity as exactly one of: "Common", "Rare", or "Legendary".
Stamp Name: ${name}
Origin: ${origin}
Respond ONLY with the single word classification (Common, Rare, or Legendary). No other text.`;

  const data = {
    model: "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 10
  };

  const response = await fetch(
    "https://router.huggingface.co/v1/chat/completions",
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("HF Router error:", errText);
    throw new Error(`AI Scorer Error: ${errText}`);
  }

  const result = await response.json();
  if (result.error) throw new Error(result.error);

  const text = result.choices[0].message.content.trim().toLowerCase();
  
  if (text.includes("legendary")) return "Legendary";
  if (text.includes("rare")) return "Rare";
  return "Common"; // Default
}
