# BioPrecision — Setup Guide

## 1. Prerequisites
- Node.js 18+ (download from https://nodejs.org)
- An Anthropic API key (get one at https://console.anthropic.com)

## 2. Clone your repo and add these files
```bash
git clone https://github.com/bricker-d/bioprecision.git
cd bioprecision
```
Copy all files from this folder into your cloned repo.

## 3. Install dependencies
```bash
npm install
```

## 4. Add your API key
Create a file called `.env.local` in the project root:
```
ANTHROPIC_API_KEY=your_key_here
```
(Never commit this file — it's already in .gitignore)

## 5. Run the app
```bash
npm run dev
```
Open http://localhost:3000 in your browser.

## 6. Deploy to Vercel (free)
1. Push your code to GitHub
2. Go to https://vercel.com → New Project → import your repo
3. Add `ANTHROPIC_API_KEY` in Environment Variables
4. Deploy — you'll get a live URL instantly

## Project Structure
```
src/
├── app/              # Pages (Next.js App Router)
│   ├── page.tsx      # Dashboard
│   ├── actions/      # Today's Actions
│   ├── lab-results/  # Lab upload + results
│   ├── coach/        # AI Health Coach chat
│   └── api/          # Backend API routes
│       ├── chat/     # Streaming AI chat
│       └── parse-labs/ # Lab PDF/Excel parsing
├── components/       # Reusable UI components
├── lib/              # Types, utilities, mock data
└── store/            # Zustand global state
```
