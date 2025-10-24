## Thomasville Shuttle (Rose City Shuttle)

Next.js App Router project configured for Netlify deployment.

### Requirements
- Node >= 20.9.0
- NPM 10+

### Environment Variables
Create a `.env.local` for local dev and set the same in Netlify environment settings:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

Firebase is configured with public web SDK credentials baked in. If you change your Firebase project, update `lib/firebase.ts`.

### Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Build

```bash
npm run build && npm start
```

### Netlify
- Build command: `npm run build`
- Publish directory: `.next`
- Plugin: `@netlify/plugin-nextjs`
- Set environment: `NODE_VERSION=20`
- Set Stripe env vars in Netlify as above.

### GitHub Setup
```bash
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```
