# Tonight's setup

Browser only. No terminal, no local testing. About 40 minutes, most of it waiting on DNS.

When you finish Step 5 the site is live, the form works, and her dashboard is reading real messages.

---

## Step 1 — Domain ✅ done

`fireplacefacelifts.net`, registered at IONOS. The page metadata now points at it.

Don't touch DNS yet — Cloudflare hands you the nameservers in Step 6.

---

## Step 2 — New GitHub repo

1. github.com → **New repository**
2. Name `fireplace-facelifts` · **Private** · don't initialise with a README
3. On the empty repo page, click **uploading an existing file**
4. Unzip the build on your machine, then drag **the contents** in — `index.html`, `admin/`, `assets/`, `functions/`, and the rest. Not the outer folder.
5. Commit

⚠️ Check that `assets/work/` and `assets/shades/` both arrived with their images. GitHub's drag-and-drop sometimes drops nested folders — if one is missing, open the folder on GitHub and drag the images in separately.

This is its own repo, not the Aether & Ash one. Keeping it separate means her site can't break yours, and the `functions/api/contact.js` here won't collide with the one already serving aetherandash.digital.

---

## Step 3 — Cloudflare Pages

**Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick the repo.

| Setting | Value |
|---|---|
| Framework preset | **None** |
| Build command | *leave empty* |
| Build output directory | `/` |

**Save and Deploy.**

> It must be a **Pages** project. Cloudflare pushes you toward Workers by default, and Workers can't run the `functions/` folder — that's the thing that bit us on the Aether & Ash deploy.

---

## Step 4 — Attach the database

The database already exists. You're only connecting it.

**Settings** → **Bindings** → **Add** → **D1 database**

| Variable name | Database |
|---|---|
| `DB` | `fireplace-facelifts` |

Must be exactly `DB`, capitals. (For reference: ID `e9a037f6-c284-4528-9317-f6fbd7bd6ed4`, Seattle region, both tables already built.)

---

## Step 5 — Variables

**Settings** → **Variables and Secrets** → add to **Production**:

| Name | Type | Value |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | Pick something for her dashboard |
| `SESSION_SECRET` | Secret | 40+ random characters, mash the keyboard |

Then **Deployments** → **⋯** → **Retry deployment** so the bindings take effect.

✅ **Site is live. Form works. Messages land in her dashboard at `/admin/`.**

She won't get an email alert yet — that's Step 7 — but nothing is lost. Every message is in the database the moment it's sent.

---

## Step 6 — Point the domain

**Custom domains** → **Set up a domain** → enter it → follow the nameserver instructions Cloudflare gives you for IONOS.

DNS usually takes under an hour. Occasionally longer. Nothing to do but wait.

---

## Step 7 — Email alerts (do this once DNS has moved)

So she gets a notification instead of having to remember to check.

1. **resend.com** → free account (3,000/month)
2. **Domains** → **Add Domain** → enter the domain
3. Resend shows 3–4 DNS records. Add each in **Cloudflare → DNS → Records**
   - Copy and paste exactly. One wrong character fails silently.
   - Each one set to **DNS only** — grey cloud, not orange
4. Back in Resend → **Verify**
5. **API Keys** → Create → copy it

Then add three more variables in Cloudflare and redeploy:

| Name | Type | Value |
|---|---|---|
| `RESEND_API_KEY` | Secret | The key you just copied |
| `OWNER_EMAIL` | Secret | Where alerts land. Her normal email is fine — it's never public |
| `FROM_EMAIL` | Plaintext | `Fireplace Face Lifts <hello@thedomain.com>` |
| `SITE_URL` | Plaintext | `https://thedomain.com` |

Now she gets an email per enquiry, **and** can reply straight from the dashboard — the reply goes out from the business address with the customer's original quoted underneath, and their reply comes back to `OWNER_EMAIL`.

---

## Step 8 — Google Voice (free, whenever)

Keeps her personal cell off the internet.

1. voice.google.com → her Google account → pick a Tacoma-area number
2. Forward it to her cell
3. Send me the number and I'll put it in — the site rewrites itself around it, offering text-a-photo in the contact section, the footer, and step one of "How it goes"

⚠️ Never her personal cell. See the safety section in the README.

---

## Before telling anyone about it

The site is advertising under Washington law. None of these are on it yet, and none should go on until they're true.

| Call | Number | Ask |
|---|---|---|
| L&I | 1-800-647-0982 | Does painting/refinishing fireplaces need contractor registration? |
| Dept. of Commerce | LBPInfo@Commerce.wa.gov | Does painting over intact paint count as "disturbing" it? **Get it in writing.** |
| Dept. of Revenue | 360-705-6741 | Business licence, UBI, sales tax, reseller permit |
| City of Fife | 253-922-2489 | City business licence + home occupation permit |

When registration comes through, send me the number and I'll switch the credential lines on. They're off by default — advertising a credential you don't hold is its own violation.

---

## What's on the page

| Section | What it does |
|---|---|
| Hero | The half-painted photo. The whole pitch in one frame. |
| **Colours** | Pick a shade, drag across to see it against bare brick. Real brick from her job, recoloured. |
| The work | Before and after, side by side |
| What we do | Four services |
| **Three questions** | Answers what she'd suggest, then drops it into the form pre-filled |
| How it goes | Four steps |
| **Questions** | Eight FAQs, including what it costs and whether paint peels |
| Contact | Form, with optional photo attachment |

The colour picker and the quiz both feed the contact form — pick a shade or finish the quiz, hit the button, and it scrolls down with the project type and a sentence already written.

---

## Changing things later

Edit the file on GitHub (pencil icon) → commit → Cloudflare rebuilds in about a minute.

| What | Where |
|---|---|
| Any wording | `index.html` — search for the sentence |
| Phone, credentials | `assets/app.js`, top of file |
| Colours and type | `assets/styles.css`, the `:root` block |
| Adding a photo | Drop it in `assets/work/`, copy a `<figure class="plate reveal">` block in `index.html` |
| Her dashboard password | Cloudflare → Variables → `ADMIN_PASSWORD` → redeploy |

If an edit breaks something, GitHub keeps every version: **History** → pick the one before → **Revert**. You can't permanently break this.
