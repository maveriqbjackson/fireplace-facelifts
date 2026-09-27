# What you need to do

Everything here is browser-only. No terminal, no local dev.

Work top to bottom — each stage unlocks the next. The site can go live at **Stage 3**; email can follow after.

---

## Stage 1 — Buy the domain

**Where:** IONOS (same account as the others)

1. Search `fireplacefacelifts.com`. If it's taken, try `fireplacefacelifts.net` or `fireplacefacelift.com` and tell me which you got — it's referenced in the code.
2. Buy it. Skip every upsell (they'll push private registration, email hosting, website builder — you don't need any of it).
3. Don't touch DNS yet.

**Check her Facebook page first.** It's already called "Fireplace Face Lifts", so match the spelling exactly.

---

## Stage 2 — Put the code on GitHub

1. github.com → **New repository**
2. Name: `fireplace-facelifts` · **Private** · don't add a README
3. On the empty repo page click **uploading an existing file**
4. Unzip `fireplace-facelifts.zip` on your computer, then drag **the contents** in — `index.html`, `admin/`, `assets/`, `functions/`, and the rest. Not the outer folder itself.
5. Commit.

⚠️ Make sure `assets/work/` came across with its three `.jpg` files. GitHub's uploader sometimes drops empty-looking folders.

---

## Stage 3 — Deploy on Cloudflare

**Create the project**

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick the `fireplace-facelifts` repo
3. Framework preset: **None** · Build command: **leave empty** · Output directory: `/`
4. **Save and Deploy**

**Bind the database** — Settings → Bindings → Add → D1

| Variable name | Database |
|---|---|
| `DB` | `fireplace-facelifts` |

Must be exactly `DB`. The database already exists (ID `e9a037f6-c284-4528-9317-f6fbd7bd6ed4`, Seattle region) with both tables built.

**Add the two variables you can set now** — Settings → Variables and Secrets → Production

| Name | Type | Value |
|---|---|---|
| `ADMIN_PASSWORD` | Secret | Pick something for her dashboard |
| `SESSION_SECRET` | Secret | 40+ random characters, mash the keyboard |

**Redeploy** (Deployments → ⋯ → Retry) so the bindings take effect.

**Point the domain** — Custom domains → Set up → enter the domain → follow the IONOS nameserver instructions Cloudflare gives you.

✅ **At this point the site is live and the form works.** Messages save to the database and she reads them at `/admin/`. She just won't get email notifications yet, and can't reply from the dashboard.

---

## Stage 3.5 — Make the form work today (2 minutes)

If the site is sitting anywhere static — the preview address, or anywhere before Cloudflare is finished — the form can still work. It just needs a free relay.

1. Go to **web3forms.com**
2. Type in the email address the messages should go to (her normal personal email is fine — it's never shown publicly)
3. A key arrives in that inbox within a minute. No account, no card.
4. In `assets/app.js`, paste it in:
   ```js
   web3formsKey: "a1b2c3d4-0000-0000-0000-abcdef123456",
   ```
5. Commit.

Free tier is 250 messages a month, which is far more than a new business will see.

**Clear it back to `null` once Stage 4 is done** — with the Cloudflare deployment live, the form should go through `/api/contact` instead so messages land in the database and the dashboard.

---

## Stage 3.6 — Letting people attach a photo (1 minute)

The form has a photo box built in, but it stays hidden until it has somewhere to put the file. Web3Forms only carries attachments on its paid plan, so photos go to a free image host instead and the links land in the email.

1. Go to **api.imgbb.com** and get a free API key. No card, takes a minute.
2. In `assets/app.js`, set `imgbbKey` to it.
3. Commit.

The "Add a photo" box then appears on the form by itself. Photos are shrunk in the browser first, so a 5MB phone photo becomes about 200KB before it goes anywhere.

**If you skip this**, the box stays hidden and nothing looks broken — people just describe the fireplace and get asked for a picture in the reply.

Once Stage 4 is done and the form is going through Cloudflare, this isn't needed at all: photos travel with the message and arrive as real attachments on the notification email.

---

## Stage 4 — Email (do this next, it's ~20 minutes)

Nothing on the site advertises an email address right now, because one that bounces is worse than none. This turns it on.

1. **resend.com** → sign up free (3,000 emails/month, plenty)
2. **Domains** → **Add Domain** → enter the domain
3. Resend shows you 3–4 DNS records (DKIM, SPF, and usually DMARC)
4. Add each one in **Cloudflare** → DNS → Records (Cloudflare runs DNS once Stage 3's nameserver switch completes)
   - Copy/paste exactly. One wrong character and it silently fails.
   - Set each to **DNS only** (grey cloud), not proxied
5. Back in Resend → **Verify**. Usually minutes, occasionally an hour.
6. **API Keys** → Create → copy it (shown once)

**Then add three more Cloudflare variables:**

| Name | Type | Value |
|---|---|---|
| `RESEND_API_KEY` | Secret | The key you just copied |
| `OWNER_EMAIL` | Secret | Where her notifications land — her normal personal email is fine, it's never public |
| `FROM_EMAIL` | Plaintext | `Fireplace Face Lifts <hello@fireplacefacelifts.com>` |
| `SITE_URL` | Plaintext | `https://fireplacefacelifts.com` |

Redeploy. Now she gets an email per enquiry and can reply straight from the dashboard.

**Optional:** once verified, add the public address to the site — in `assets/app.js`, set `email: "hello@fireplacefacelifts.com"`. It'll appear in the contact section and footer automatically.

---

## Stage 5 — Google Voice

Free, and it keeps her personal cell off the internet.

1. voice.google.com → sign in with her Google account → pick a Tacoma-area number
2. Set it to forward to her cell
3. In `assets/app.js`:
   ```js
   phone:       "(253) 555-0148",
   phoneDigits: "12535550148",
   ```
4. Commit. Cloudflare redeploys itself.

The site rewrites itself around it — the contact section, the footer, and step one of "How it goes" all start offering text-a-photo.

⚠️ **Never put her personal cell number on the site.** See the safety section in the README.

---

## Stage 6 — Before you tell anyone about it

The site is advertising under Washington law. These aren't optional, and none of them are on the site yet.

| Call | Number | Ask |
|---|---|---|
| L&I | 1-800-647-0982 | Does painting/refinishing fireplaces need contractor registration? |
| Dept. of Commerce | LBPInfo@Commerce.wa.gov | Does painting over intact paint count as "disturbing" it? **Get this in writing.** |
| Dept. of Revenue | 360-705-6741 | Business licence, UBI, sales tax, reseller permit |
| City of Fife | 253-922-2489 | City business licence + home occupation permit |

When registration comes through, open `assets/app.js` and flip the flags:

```js
credentials: {
  contractorRegistered: true,
  contractorNumber:     "FIREPFL781QK",   // WA requires this in advertising
  bonded:               true,
  insured:              true,
  leadSafeCertified:    false,            // only if Commerce says it's required AND she has it
},
```

Those lines then appear in the "How we work" panel and the footer. **Don't switch any of them on early** — advertising a credential you don't hold is its own violation.

---

## Stage 7 — Photos

Three are on the site: one mid-paint shot, and a before/after pair of the same fireplace.

The mid-paint one is doing the heavy lifting — it shows the whole pitch in a single frame. The other two came from phone photos of old prints and are as sharp as that source allows.

**If she still has the original prints, get them scanned** — any library or FedEx Office will do 600dpi for a couple of dollars. That would beat anything I can recover from a photo of a photo, and it's the single biggest jump available on those two images.

**Replace them as soon as there are Pierce County jobs.** Six shots per job, per the guide in her doc: wide before, close before, detail before, then the same three framings after. Same spot for the after as the before.

To add one: put the file in `assets/work/`, open `index.html`, find the `#work` section, copy a `<figure class="plate reveal">` block and swap the `src`, `width`, `height`, `alt` and caption.

⚠️ **Only ever her own work.** No stock, no blog photos, no supplier images.

---

## Quick reference

| Thing | Where |
|---|---|
| Live site | `fireplacefacelifts.com` |
| Her dashboard | `fireplacefacelifts.com/admin/` |
| Database | Cloudflare → Workers & Pages → D1 → `fireplace-facelifts` |
| Editing copy | `index.html` |
| Phone, email, credentials | `assets/app.js`, top of file |
| Colours and type | `assets/styles.css`, `:root` block |

To change anything: edit the file on GitHub in the browser, commit, and Cloudflare redeploys in about a minute.
