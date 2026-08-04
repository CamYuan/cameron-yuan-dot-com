# cameron-yuan-dot-com

Personal portfolio site. Built with Next.js (App Router) + TypeScript. The homepage's
"interview my agent" demo is a real LangGraph.js `StateGraph` (Router → parallel
Experience/Projects/Skills specialists → Synthesizer) backed by OpenRouter's free tier.

## Local development

```bash
npm install
cp .env.example .env.local   # then set OPENROUTER_API_KEY
npm run dev
```

## Testing

```bash
npm run test
```

## Deployment

Deployed on Vercel, connected to this repo's `main` branch (auto-deploy on push).

Required environment variable in the Vercel project settings:

- `OPENROUTER_API_KEY` — an OpenRouter API key (free tier). Get one at
  https://openrouter.ai/keys. Never commit this key — it is read only from the
  environment (see `src/lib/graph/model.ts`).
