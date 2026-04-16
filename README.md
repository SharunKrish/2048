<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/34b0e5c7-1556-4efc-a365-e7c818f2ef04

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy To Vercel

1. Push this repository to GitHub.
2. In Vercel, create a new project and import the repository.
3. Keep the defaults (Vercel will run `npm run build` and publish `dist`).
4. Click Deploy.

This repo includes `vercel.json` with SPA rewrites so deep links resolve to `index.html`.
