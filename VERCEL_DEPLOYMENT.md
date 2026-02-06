# Vercel Deployment Guide

This guide will help you deploy the Tracker 3.0 app to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. GitHub repository connected to Vercel
3. Environment variables configured

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the Vite framework

### 2. Configure Environment Variables

In your Vercel project settings, add the following environment variables:

**Required:**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**For Serverless Functions:**
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `GROQ_API_KEY` - Groq API key for AI notes generation

### 3. Build Settings

Vercel will automatically detect:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 4. Deploy

1. Click "Deploy" button
2. Wait for the build to complete
3. Your app will be live at `your-project.vercel.app`

## API Routes

The app uses Vercel serverless functions located in the `api/` directory:

- `/api/youtube` - Fetches YouTube playlist data
- `/api/groq` - Generates AI study notes

These functions are automatically deployed with your app.

## Environment Variables Setup

### In Vercel Dashboard:

1. Go to your project → Settings → Environment Variables
2. Add each variable for Production, Preview, and Development environments
3. Click "Save"

### Required Variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
YOUTUBE_API_KEY=your-youtube-api-key
GROQ_API_KEY=your-groq-api-key
```

## Troubleshooting

### Build Fails
- Check that all environment variables are set
- Verify `package.json` has correct dependencies
- Check build logs in Vercel dashboard

### API Routes Not Working
- Ensure `@vercel/node` is in `package.json` devDependencies
- Check that functions are in `api/` directory
- Verify environment variables are set for serverless functions

### CORS Issues
- CORS headers are configured in `vercel.json`
- If issues persist, check API route response headers

## Local Development

For local development with Vercel:

```bash
npm install -g vercel
vercel dev
```

This will run your app locally with Vercel serverless functions.

## Migration from Netlify

If you were previously using Netlify:

1. Functions have been moved from `netlify/functions/` to `api/`
2. Service files updated to use `/api/` routes in production
3. Netlify functions still work in development mode
4. Remove `netlify.toml` if not needed

## Support

For issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev)
- Project README.md
