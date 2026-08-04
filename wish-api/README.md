# Wish API (local only)

Phase 0 starts a local health endpoint at `http://127.0.0.1:8787/health`.

Telegram sending is intentionally not implemented yet. Phase 4 will read the bot token from `.env.local`, resolve `giftId` through `gifts.local.json`, validate/rate-limit wishes, then call Telegram without exposing the token or `chatId` to the generated HTML.
