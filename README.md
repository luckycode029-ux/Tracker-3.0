<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15vpRxLhg_awvtn-TXUV40e2WoiIYN83L

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GROQ_API_KEY` in [.env.local](.env.local) to your Groq API key
   - For production (Netlify), set `GROQ_API_KEY` in the Netlify dashboard under Site settings → Build & deploy → Environment → Environment variables.
   - For local development, copy `.env.example` to `.env.local` and add your keys (do NOT commit `.env.local`).
3. Run the app:
   `npm run dev`

Security notes:
- If an API key is leaked, revoke/rotate it immediately in the provider console (e.g., Google Cloud Console) and create a new key.
- Restrict API key usage by HTTP referrer (domains) or IP addresses where possible.
- Remove secrets from git history if they were committed (see below).

How to remove leaked keys from git history (local):
```bash
# Use the BFG or git filter-repo to remove secrets from history
# Example with BFG (install first):
# bfg --delete-files .env
# After running BFG, run:
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```
