# Fireplace Face Lifts

> **Setting it up? Read [SETUP.md](SETUP.md)** — the step-by-step, browser-only checklist.


Marketing site + message dashboard for a fireplace refinishing business in Fife, Washington.

**Stack:** static HTML/CSS/JS · Cloudflare Pages · Pages Functions · D1 · Resend

No build step. What's in the repo is what ships.

---

## ⚠️ Personal safety — read before editing any copy

The site is deliberately written in a **neutral business voice**: "we", never "she". There is no owner name, no photograph of the operator, no gender, and no indication that one person works alone.

That is not a style choice. A public page saying *a woman works alone and lives nearby, and will come to your house* is a targeting profile for anyone who reads it that way. Small-business "we" is completely standard, legally fine, and gives up nothing.

**Rules for anything added later — copy, reviews, social posts, quote emails:**

- Never "she", "her", "I", or a personal name.
- Never "just one person", "no crew", "it's only me", "solo".
- Never a response-time or duration promise — no "same day", no "usually one day". The site deliberately makes no timing claims: they set expectations that get broken, and they're a promise she'd have to keep on her worst week.
- Never anything about living nearby, being minutes away, or a home address. Service area **by town** is fine and needed for local search; proximity-to-the-customer is not.
- The contact number must be the **Google Voice** number, never a personal cell.
- No photographs of the operator.
- If customer reviews come in written as "she", edit them to "they" or the business name before publishing.

⚠️ **The Nextdoor draft from earlier needs this same pass** — it opens with a personal name and "I live right here in Fife". Do not post it as written.

---

## ⚠️ Read this before the site goes live

Two things in here are deliberately switched **off**, and they need to stay off until the paperwork is real.

### 1. Photo rights — resolve this before launch

`assets/work/` currently holds four before/after pairs split out of collages that were supplied as placeholders. **At least some of them do not appear to be her work** — one carried another company's BEFORE/AFTER branding (cropped off), and the filenames read like blog posts.

Using someone else's projects as her portfolio is copyright infringement *and* deceptive advertising under Washington's Consumer Protection Act (RCW 19.86). One homeowner running a reverse image search ends her reputation in a town this size.

Before the site goes public, confirm for every photograph on the page that she did the work **and** owns the image. Delete any that fail.

The section adapts to however many projects survive. One real project beats four borrowed ones.

### 2. Credential claims

`assets/app.js` → `CONFIG.credentials` — every flag defaults to `false`.

Nothing on the site currently claims she is licensed, bonded, insured, or lead-safe certified. **Do not turn any of these on until the corresponding registration actually exists.** Advertising a credential you don't hold is a separate violation from not holding it.

When L&I issues her registration number, set `contractorNumber` — Washington requires registered contractors to display it in advertising, and the footer will render it automatically.

### 3. The site itself is advertising

Under RCW 18.27, a contractor must be registered **before** advertising, offering, or bidding on work. Publishing this site is advertising. Confirm with:

| What | Who | Number |
|---|---|---|
| Contractor registration | WA Dept. of Labor & Industries | 1-800-647-0982 |
| Lead / RRP certification | WA Dept. of Commerce | LBPInfo@Commerce.wa.gov · 360-586-5323 |
| State business licence, sales tax, B&O | WA Dept. of Revenue | 360-705-6741 |
| City business licence | City of Fife | 253-922-2489 |

The county is not the regulator for the first two.

### Language rules baked into the copy

The site never says **strip**, **sand**, **remove**, or **demolition** as something she does. The differentiator is deliberately the opposite: *"we work over your existing finish."* If you edit copy, keep it that way — it's both the honest description and the stronger pitch.

---

## Repo layout

```
index.html               Landing page (hero = first project in CONFIG)
admin/index.html         Her message dashboard
assets/
  styles.css             Site styles
  admin.css              Dashboard styles
  app.js                 CONFIG BLOCK + site behaviour  ← edit this one
  admin.js               Dashboard behaviour
  favicon.svg
  work/                  before/after pairs — {slug}-before.webp/.jpg + {slug}-after.webp/.jpg
functions/api/
  _auth.js               Signed-cookie session helpers
  contact.js             POST — saves a message, emails her
  login.js               POST / DELETE — sign in, sign out
  messages.js            GET  — list messages + replies
  reply.js               POST — sends her reply to the customer
schema.sql               D1 schema (already applied)
_headers                 Security headers, admin noindex
robots.txt
```

---

## Deploy

### 1. Push to GitHub

```bash
cd fireplace-facelifts
git init
git add -A
git commit -m "Fireplace Facelifts: site, dashboard, and API"
git branch -M main
git remote add origin git@github.com:YOUR-USER/fireplace-facelifts.git
git push -u origin main
```

### 2. Create the Pages project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.

- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: `/`

### 3. Bind the database

The D1 database already exists:

- **Name:** `fireplace-facelifts`
- **ID:** `e9a037f6-c284-4528-9317-f6fbd7bd6ed4`
- **Region:** WNAM (Seattle)

Pages project → **Settings** → **Bindings** → **Add** → **D1 database**

| Variable name | Database |
|---|---|
| `DB` | `fireplace-facelifts` |

The binding must be named exactly `DB`.

### 4. Environment variables

Pages project → **Settings** → **Variables and Secrets**. Add to **Production** (and Preview if you use it):

| Name | Type | Value |
|---|---|---|
| `RESEND_API_KEY` | Secret | Resend API key |
| `OWNER_EMAIL` | Secret | Where her notifications land |
| `FROM_EMAIL` | Plaintext | `Fireplace Facelifts <hello@fireplacefacelifts.net>` |
| `ADMIN_PASSWORD` | Secret | Her dashboard password |
| `SESSION_SECRET` | Secret | Long random string — see below |
| `SITE_URL` | Plaintext | `https://fireplacefacelifts.net` |

Generate a session secret:

```bash
openssl rand -hex 32
```

### 5. Domain + email

- Point the domain at Pages under **Custom domains**.
- Verify the sending domain in Resend. **The DNS records go on the registrar** (IONOS, same as the other sites) — not Cloudflare, unless Cloudflare is the registrar for this one.
- `FROM_EMAIL` must be on a domain Resend has verified, or nothing sends.

---

## Configuring the site

Everything editable lives at the top of `assets/app.js`.

### When the Google Voice number is live

```js
phone:       "(253) 555-0148",
phoneDigits: "12535550148",
```

That's it. The contact section, footer, and the "how it works" step-one copy all pick it up and start offering text-a-photo.

### Her name

There is intentionally no `ownerName` setting. See "Personal safety" above.

### When credentials are real

```js
credentials: {
  contractorRegistered: true,
  contractorNumber:     "FIREPFL781QK",
  bonded:               true,
  insured:              true,
  leadSafeCertified:    false,   // only if Commerce says it's required and she has it
},
```

### Adding before/after photos

The gallery section is **hidden** while the array is empty, so an empty gallery never ships. Put the files in `assets/work/` and add entries:

```js
gallery: [
  {
    before: "assets/work/puyallup-01-before.jpg",
    after:  "assets/work/puyallup-01-after.jpg",
    note:   "1970s red brick, painted in Mortar White. Puyallup. One day.",
    alt:    "A red brick fireplace before and after being painted soft white"
  },
],
```

Each entry renders as a **draggable before/after slider** — drag the handle, or use the keyboard via the range input.

Keep images under ~400 KB each and matched in dimensions. Same camera position for both shots — mismatched pairs read as two different fireplaces and the slider exposes that instantly.

**Work done outside Washington:** don't caption it as a local job. The captions on the page describe the fireplace, not the city, which keeps it accurate without drawing attention to where or when. Never let older work read as a recent Pierce County job.

---

## The dashboard

`https://fireplacefacelifts.net/admin/`

She signs in with `ADMIN_PASSWORD`. Session lasts 30 days so she isn't constantly logging in.

- Every form submission lands here, newest first, tagged **New** until answered.
- She types a reply in the box and hits send — it goes from the business email address to the customer's inbox, with their original message quoted underneath. If they hit reply, it comes back to `OWNER_EMAIL`.
- A message is only marked **Answered** if the email actually left. If Resend fails, the reply is saved and shown as *"Did not send"* so nothing silently disappears.
- She also gets an email notification for every new message, so she doesn't have to remember to check.

`is_test = 0` filtering is already in the query, so seed rows never appear in her view.

---

## Local development

```bash
npm install -g wrangler
wrangler pages dev . --d1 DB=fireplace-facelifts
```

Put secrets in `.dev.vars` (gitignored):

```
RESEND_API_KEY=re_...
OWNER_EMAIL=her@email.com
ADMIN_PASSWORD=something
SESSION_SECRET=...
```

---

## Still open

- [ ] L&I, Commerce, Revenue and City of Fife calls — then flip the credential flags
- [ ] Google Voice number → `CONFIG.phone`
- [ ] Domain registered and pointed
- [ ] Resend domain verified at the registrar
- [ ] **Confirm photo rights on all four current projects — remove any that aren't hers**
- [ ] First Pierce County before/after set photographed
- [ ] Set `CONFIG.ownerName` to how she wants the note signed
- [ ] Decide whether she updates the projects or you do
