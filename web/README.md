This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

1. **Import the repo** at [vercel.com/new](https://vercel.com/new). Use the repo root; then in **Project Settings → General** set **Root Directory** to `web`.
2. **Environment variables** (Settings → Environment Variables):
   - `GEMINI_API_KEY` – for the agent (required).
   - `PYTHON_SERVICE_URL` – full URL of your deployed Python API (e.g. `https://your-python-api.up.railway.app`). Omit only if the frontend doesn’t call the Python service.
3. Deploy; Vercel will run `npm install` and `npm run build` in the `web` directory.
