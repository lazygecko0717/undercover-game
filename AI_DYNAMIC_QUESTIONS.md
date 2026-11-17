# 誰是臥底：AI 動態題庫設定

目前遊戲前端已加入 AI 動態出題呼叫，並新增 Cloudflare Worker 範例：`worker/index.js`。

## 架構

- GitHub Pages：遊戲畫面與流程。
- Cloudflare Worker：安全轉送出題請求，保管 OpenAI API 金鑰。
- OpenAI Responses API：每局產生一組平民詞／臥底詞配對。

API 金鑰**不可**放進 `index.html`、GitHub repository、遊戲設定欄或任何公開前端程式碼。

## 部署 Worker

建議由成年帳戶管理者建立 Cloudflare 與 OpenAI API 帳戶及付款設定。

1. 在 OpenAI API Platform 建立 API key。API 使用量與 ChatGPT 訂閱分開計費。
2. 登入 Cloudflare Dashboard，進入 **Workers & Pages**，建立一個 Worker。
3. 將本 repository 的 `worker/index.js` 完整內容貼入 Worker 編輯器並部署。
4. 在 Worker 的 **Settings / Variables and Secrets** 新增 Secret：
   - Name：`OPENAI_API_KEY`
   - Value：剛建立的 OpenAI API key
5. 可選擇新增一般文字變數 `OPENAI_MODEL`；未設定時預設使用 `gpt-6-luna`。
6. 部署完成後，複製 Worker 的 `https://....workers.dev` 網址。

## 遊戲連線

1. 開啟 GitHub Pages 遊戲。
2. 在設定頁的「AI 出題服務網址」欄位貼上 Worker 網址。
3. 按「儲存 AI 服務網址」。
4. 選擇兒童／成人難度與題目類別，開始遊戲。

網址只會儲存在該瀏覽器的 localStorage。換裝置或清除網站資料後，需要重新設定。

## 安全與費用

- Worker 僅允許目前 GitHub Pages 網域的瀏覽器跨來源呼叫；CORS 本身不是完整的身分驗證。
- 上線前，請在 Cloudflare 為 Worker 設定每 IP 的速率限制／防濫用規則；若使用 Worker Rate Limiting binding，名稱設為 `GAME_LIMITER`，程式會自動套用。
- 在 OpenAI API Platform 設定用量通知與支出上限，並定期檢查用量。
- API 金鑰與付款帳戶應由成年帳戶管理者保管。
- AI 會盡量產生難度與類別相符的詞語，但仍可能偶爾產生不理想配對；Worker 會檢查基本格式，遊戲主持人可在發牌前決定是否重抽。
