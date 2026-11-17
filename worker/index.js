const ALLOWED_ORIGIN = "https://lazygecko0717.github.io";
const MODEL_DEFAULT = "gpt-6-luna";
const CATEGORIES = ["地點","食物","動物","日常用品","交通工具","休閒活動"];

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
      "Vary": "Origin"
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) return new Response("Forbidden", { status: 403 });
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!env.OPENAI_API_KEY) return json({ error: "Worker 尚未設定 OPENAI_API_KEY" }, 503);

    let body;
    try { body = await request.json(); }
    catch { return json({ error: "請求格式不是有效 JSON" }, 400); }

    const difficulty = body?.difficulty;
    const requestedCategory = body?.category;
    if (!["kids", "adult"].includes(difficulty)) return json({ error: "難度設定無效" }, 400);
    if (requestedCategory !== "隨機" && !CATEGORIES.includes(requestedCategory)) {
      return json({ error: "題目類別無效" }, 400);
    }

    const category = requestedCategory === "隨機"
      ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
      : requestedCategory;
    const levelGuide = difficulty === "kids"
      ? "兒童難度：以台灣國小學生熟悉、容易理解的具體生活詞彙為主，避免冷僻字、抽象概念、成人內容及專業知識。"
      : "成人難度：可使用多元生活、文化、知識與情境詞彙，但仍須是一般人能理解的常見詞語，不要使用過度冷僻或專業的詞。";

    const prompt = [
      "你是繁體中文派對遊戲「誰是臥底」的出題員。",
      "請產生一組適合遊戲的詞語配對，回傳繁體中文。",
      "題目類別："+category+"。",
      levelGuide,
      "兩個詞語必須屬於同一類別或相近情境，讓玩家描述時容易混淆但仍能區分。",
      "不可是同義詞、完全相同的事物、上下位詞或只是不同寫法；避免答案有爭議。",
      "詞語以2至6個中文字為佳，不要加解釋、標點或句子。",
      "每次盡量選擇不同於常見入門範例的新配對。",
      "輸出 pair[0] 作為平民詞，pair[1] 作為臥底詞；遊戲端會再隨機對調。"
    ].join("\n");

    let apiResponse;
    try {
      apiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.OPENAI_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || MODEL_DEFAULT,
          input: prompt,
          max_output_tokens: 120,
          text: {
            format: {
              type: "json_schema",
              name: "undercover_word_pair",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  pair: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 2
                  }
                },
                required: ["pair"],
                additionalProperties: false
              }
            }
          }
        })
      });
    } catch {
      return json({ error: "目前無法連線至 AI 服務，請稍後再試。" }, 502);
    }

    if (!apiResponse.ok) {
      const status = apiResponse.status;
      return json({ error: status === 401 || status === 403
        ? "AI API 金鑰或權限設定有誤。"
        : status === 429
          ? "AI API 使用量或速率限制已達上限，請稍後再試。"
          : "AI 出題服務暫時無法使用，請稍後再試。" }, 502);
    }

    let payload;
    try { payload = await apiResponse.json(); }
    catch { return json({ error: "AI 回應格式無法讀取。" }, 502); }

    const outputText = payload.output
      ?.flatMap(item => item.content || [])
      .find(item => item.type === "output_text")?.text;
    let result;
    try { result = JSON.parse(outputText || "{}"); }
    catch { return json({ error: "AI 產生的題目格式不正確，請再試一次。" }, 502); }

    const pair = result.pair;
    if (!Array.isArray(pair) || pair.length !== 2 ||
        pair.some(word => typeof word !== "string" || !word.trim() || word.length > 12) ||
        pair[0].trim() === pair[1].trim()) {
      return json({ error: "AI 產生的詞語配對不符合規格，請再試一次。" }, 502);
    }

    return json({ category, pair: pair.map(word => word.trim()) });
  }
};
