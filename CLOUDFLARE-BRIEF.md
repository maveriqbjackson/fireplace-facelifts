# Cloudflare setup brief — Fireplace Face Lifts

Paste the block below into Cloudflare's assistant.

**Before you do — know what you're dealing with.** Cloudflare's dashboard assistant is mostly a documentation helper. It can usually tell you *where* a setting lives, but on most accounts it cannot create a Pages project, attach a binding, or set a secret for you. If it says it can't take the action, nothing is lost — the same text works as your own click-by-click checklist. Every value you need is in it.

---

## The prompt

> I need to deploy an existing GitHub repository to Cloudflare Pages and wire it to a D1 database. Walk me through each step, and carry it out for me wherever you're able to.
>
> **The project**
> - GitHub repo: `maveriqbjackson/fireplace-facelifts`
> - Branch: `main`
> - It must be a **Pages** project, not a Worker. The repo has a `functions/` directory that only runs on Pages.
>
> **Build settings**
> - Framework preset: None
> - Build command: leave empty — there is no build step, it's static HTML
> - Build output directory: `/`
> - Root directory: leave as the repo root
>
> **D1 binding**
> The database already exists. I am not creating one, only attaching it.
> - Binding variable name: `DB` (exactly that, uppercase)
> - Database name: `fireplace-facelifts`
> - Database ID: `e9a037f6-c284-4528-9317-f6fbd7bd6ed4`
> - Region: WNAM
> - It already has `messages` and `replies` tables. Do not run any migration or schema file.
>
> **Environment variables — Production**
> Both of these are Secrets, not plaintext:
> - `ADMIN_PASSWORD` — I will supply the value
> - `SESSION_SECRET` — I will supply the value
>
> **Then redeploy.** The bindings and variables don't take effect on the existing deployment, so trigger a fresh one after they're saved.
>
> **What to confirm when it's done**
> 1. The Pages project builds and gives me a `.pages.dev` URL
> 2. `/admin/` on that URL loads a password screen rather than a 404
> 3. `POST /api/contact` returns JSON, not a 404 — this tells me the `functions/` directory was picked up
>
> Tell me at each step whether you did it or whether I need to click it myself.

---

## Your two values

Paste these into Cloudflare as **Secrets**. They go in Cloudflare only, never in the repo.

**`SESSION_SECRET`** — already generated, just copy it:

```
2612135352f176a18b9d0afcfd041e6e02ebdf2d70c8ffb7fef4fb33f60a3b6f
```

Nobody ever types this one. It only signs her login cookie, so the browser can tell a real session from a forged one. 64 hex characters from a proper random source — don't shorten it, and don't bother memorising it. If it ever leaks, change it and everyone gets signed out. That's the whole blast radius.

**`ADMIN_PASSWORD`** — you pick this one. It's what she types at `/admin/`, so make it something she'll actually remember. Three unrelated words beats a clever short one.

---

## Doing it by hand, if the assistant can't

1. **Workers & Pages** → **Create** → **Pages** tab → **Connect to Git** → pick `fireplace-facelifts`
2. Build settings as in the prompt above — preset **None**, build command **empty**, output `/`
3. **Save and Deploy**
4. **Settings → Bindings → Add → D1 database** → variable `DB` → database `fireplace-facelifts`
5. **Settings → Variables and Secrets** → add `ADMIN_PASSWORD` and `SESSION_SECRET`, both as **Secret**
6. **Deployments → ⋯ → Retry deployment**

That's it. The site is live and her dashboard is reading real messages.

---

## The one thing that will trip you

Cloudflare's **Create** button defaults to Workers, and the Pages option is a separate tab on that screen. A Worker will deploy this repo and look like it worked — but the `functions/` folder is ignored, so `/api/contact` 404s and the dashboard stays empty forever.

Same thing that cost time on the Aether & Ash deploy.

**How to tell which you made:** a Pages project has a **Deployments** tab and a `.pages.dev` URL. A Worker has a **Metrics** tab and a `.workers.dev` URL. If you see `.workers.dev`, delete it and start again on the Pages tab.

---

## After it's live

**The domain.** `fireplacefacelifts.net` is registered and the page metadata already points at it. Custom domains → Set up a domain → enter it → then make the nameserver change Cloudflare gives you, at IONOS. Usually under an hour to propagate.

**Email alerts.** Four more variables once DNS has moved: `RESEND_API_KEY`, `OWNER_EMAIL`, `FROM_EMAIL`, `SITE_URL`. Full sequence is in SETUP.md Step 7. Until then nothing is lost — every message is in the database the moment it's sent, she just has to open the dashboard to see it.

**The repo is public.** That's fine for the code — the admin password and session secret live in Cloudflare, never in the files, and the Web3Forms key in `app.js` is designed to sit in public HTML. But there's no reason for it to be public either. Settings → General → Change visibility → Private. Cloudflare keeps building after you flip it.
