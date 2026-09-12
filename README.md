# Privacy & Terms Guardian

A personal privacy agent for the web — a Chrome extension that analyses Privacy Policies
and Terms, protects your cookie consent, and finds better alternatives, backed by GPT-6
Astra through a separate backend so the API key never ships in the extension.

See [`privacyguardian_project.md`](./privacyguardian_project.md) for the full product spec.

## Structure

```text
privacyGuardian/
├── backend/     Node/TypeScript API — calls GPT-6 Astra, never exposes the API key
└── extension/   Chrome MV3 extension — content scripts, background worker, popup/sidebar UI
```

## Getting started

### Backend

```bash
cd backend
npm install
cp .env.example .env   # add your OPENAI_API_KEY
npm run dev             # http://localhost:8787
```

### Extension

```bash
cd extension
npm install
npm run build            # or: npm run watch
```

Then in Chrome: `chrome://extensions` → enable Developer Mode → **Load unpacked** →
select the `extension/` folder.

## MVP scope

1. **Analyse** — flag hidden qualifications, data sharing, marketing permissions, tracking,
   retention, and one-sided clauses in a site's policies, each backed by the source clause.
2. **Protect** — reject non-essential cookies via deterministic CMP handlers, falling back
   to Astra for unfamiliar consent UIs, then verify the result.
3. **Find Better** — identify the service category and surface alternatives ranked against
   the user's privacy profile.

Landing page, accounts/auth, and a persisted profile database are on the roadmap but out of
scope for the MVP.
