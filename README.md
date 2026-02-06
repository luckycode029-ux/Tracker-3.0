



This contains everything you need to run your app locally.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set environment variables:
   - For local development, create `.env.local` file with:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - For production:
     - **Vercel**: Set environment variables in Vercel dashboard (Settings → Environment Variables)
     - **Netlify**: Set in Netlify dashboard (Site settings → Build & deploy → Environment → Environment variables)
   
   Required environment variables:
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
   - `YOUTUBE_API_KEY` - YouTube Data API v3 key (for serverless functions)
   - `GROQ_API_KEY` - Groq API key (for AI notes generation)

3. Run the app:
   ```bash
   npm run dev
   ```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.

### Deploy to Netlify

1. Push your code to GitHub
2. Import your repository in [Netlify](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy!

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
