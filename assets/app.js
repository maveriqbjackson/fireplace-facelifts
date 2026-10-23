/* ==========================================================================
   Fireplace Face Lifts — site behaviour

   ▸ EDIT THE CONFIG BLOCK BELOW. Nothing else needs touching.
   ▸ Credential flags stay OFF until the registration actually exists.
   ▸ PHOTO RULE: only ever publish photographs of your own completed work.
   ========================================================================== */

const CONFIG = {

  // (intentionally no owner name — see README, "Personal safety")

  /* ---- How people get in touch ---------------------------------------
     Leave phone null until the Google Voice number is live. Setting it
     switches the site over to offering text-a-photo.                   */
  phone:       null,           // e.g. "(253) 555-0148"  — GOOGLE VOICE ONLY, never a personal cell
  phoneDigits: null,           // e.g. "12535550148"  — used for tel: links
  email:       null,           // no public email until the domain + Resend are live

  /* ---- Where the contact form sends -----------------------------------
     Two ways to run the form:

     A) web3formsKey — for the site hosted anywhere static, with no backend.
        Get a key free in about two minutes at web3forms.com: enter the
        address the messages should land at, and the key arrives by email.
        No account, no card, 250 messages a month.

     B) once the site is on Cloudflare Pages with the database attached,
        /api/contact exists and the form uses that automatically — messages
        land in the dashboard at /admin/ instead of only in an inbox.

     You do not have to change anything when that happens. The form tries
     the dashboard first and only falls back to the key if it is not there. */
  web3formsKey: "44dc9435-28ea-44d5-9a40-d77f2fb11036",

  /* ---- Letting people attach a photo ----------------------------------
     Web3Forms can't carry attachments on the free plan, so photos get
     uploaded to a free image host and the links go in the email instead.

     Get a key free at api.imgbb.com (about a minute, no card). Paste it
     below and the "Add a photo" box appears on the form by itself.

     Leave it null and the box stays hidden — people are simply asked to
     reply to the first email with the photo attached, which also works.

     Once the site is on Cloudflare this isn't needed: photos ride along
     with the message and arrive as real attachments.                     */
  imgbbKey: null,              // e.g. "9f8e7d6c5b4a3210fedcba9876543210"

  /* ---- Legal / trust lines --------------------------------------------
     KEEP EVERY ONE false UNTIL THE PAPERWORK IS REAL. Advertising a
     credential you don't hold is its own violation, separate from not
     holding it. See README.                                            */
  credentials: {
    contractorRegistered: false,   // L&I specialty contractor registration
    contractorNumber:     null,    // WA requires this in advertising once issued
    bonded:               false,
    insured:              false,
    leadSafeCertified:    false,   // Dept. of Commerce RRP
  },

  /* ---- Adding new work ------------------------------------------------
     Photographs live in assets/work/ and sit directly in index.html
     inside the #work section. To add a project, copy an existing
     <figure class="archive"> block and swap src / width / height /
     alt / caption. Nothing needs changing in here.                     */
};

/* ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  paintYear();
  renderStepOne();
  renderContactLines();
  renderCredentials();
  wireForm();
  wirePhotos();
  wireCompare();
  wireShades();
  wireQuiz();
  wireMotion();
});

/* ---- footer year -------------------------------------------------------- */
function paintYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

/* ---- step one adapts to whether a phone number exists yet --------------- */
function renderStepOne() {
  const el = document.getElementById("step-one-copy");
  if (!el) return;
  el.textContent = CONFIG.phone
    ? "Text us a picture of your fireplace, or use the form below. A phone photo is plenty, and most jobs can be priced without a visit at all."
    : "Use the form below to tell us about your fireplace. We'll write back and let you know where to send a photo — a phone picture is plenty.";
}

/* ---- contact lines ------------------------------------------------------ */
function renderContactLines() {
  const bits = [];
  if (CONFIG.phone && CONFIG.phoneDigits) bits.push(`<a href="tel:+${CONFIG.phoneDigits}">${CONFIG.phone}</a>`);
  if (CONFIG.email) bits.push(`<a href="mailto:${CONFIG.email}">${CONFIG.email}</a>`);

  const direct = document.getElementById("direct-contact");
  if (direct) {
    if (bits.length) direct.innerHTML = `Rather skip the form? ${bits.join(" or ")}.`;
    else direct.remove();
  }

  const foot = document.getElementById("footer-contact");
  if (foot) {
    if (bits.length) foot.innerHTML = bits.join(" · ");
    else foot.remove();
  }
}

/* ---- credential lines (hidden unless explicitly switched on) ------------ */
function renderCredentials() {
  const c    = CONFIG.credentials;
  const list = document.getElementById("cred-list");
  const note = document.getElementById("cred-note");
  const reg  = document.getElementById("footer-reg");
  const items = [];

  if (c.contractorRegistered) {
    items.push(c.contractorNumber
      ? `Registered contractor in Washington State — ${c.contractorNumber}`
      : "Registered contractor in Washington State");
  }
  if (c.bonded)            items.push("Bonded");
  if (c.insured)           items.push("Carries general liability insurance");
  if (c.leadSafeCertified) items.push("Lead-safe certified for pre-1978 homes");

  if (list) {
    if (items.length) {
      list.innerHTML = items.map(t => `<li>${t}</li>`).join("");
      if (note) note.textContent = "Ask and we'll send the paperwork through before any work starts.";
    } else {
      list.innerHTML = "";
      if (note) note.textContent =
        "Ask us anything about the products we use, how we look after your floors and furniture, or how long the finish takes to cure. You'll get a straight answer.";
    }
  }

  // WA requires the registration number in advertising once it exists.
  if (reg) reg.textContent = c.contractorNumber
    ? `WA Contractor Registration ${c.contractorNumber}`
    : "";
}

/* ---- scroll reveal + sticky nav shadow ---------------------------------- */
function wireMotion() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".reveal");

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });

    items.forEach((el, i) => {
      // stagger siblings so groups cascade rather than snapping in together
      const sibs = el.parentElement ? [...el.parentElement.children].filter(c => c.classList.contains("reveal")) : [];
      const idx = sibs.indexOf(el);
      if (idx > 0 && idx < 5) el.classList.add("d" + idx);
      io.observe(el);
    });
  }

  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
}

/* ---- photo attachments -------------------------------------------------- */
let BACKEND_PRESENT = null;   // null = not yet known
const PHOTOS = [];                     // { name, dataUrl, url, uploading }
const MAX_PHOTOS = 3;

function photosEnabled() {
  // The Cloudflare backend attaches photos natively; imgbb covers the relay.
  // Unknown backend counts as available — a photo is worth more than a form that hides it.
  return BACKEND_PRESENT !== false || Boolean(CONFIG.imgbbKey);
}

function wirePhotos() {
  const field = document.getElementById("photo-field");
  const input = document.getElementById("b8");
  const drop  = document.getElementById("drop");
  if (!field || !input || !drop) return;

  // Only offer it if the photo can actually go somewhere.
  if (!photosEnabled()) return;
  field.hidden = false;

  input.addEventListener("change", () => { addFiles([...input.files]); input.value = ""; });

  ["dragenter", "dragover"].forEach(e =>
    drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(e =>
    drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", ev => {
    const files = [...(ev.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/"));
    addFiles(files);
  });
}

async function addFiles(files) {
  for (const file of files) {
    if (PHOTOS.length >= MAX_PHOTOS) break;
    if (!file.type.startsWith("image/")) continue;

    const dataUrl = await shrink(file);           // phone photos are far too big to send raw
    const entry = { name: file.name, dataUrl, url: null, uploading: true };
    PHOTOS.push(entry);
    drawThumbs();

    if (CONFIG.imgbbKey) {
      try {
        entry.url = await uploadToHost(dataUrl);
      } catch {
        entry.failed = true;
      }
    }
    entry.uploading = false;
    drawThumbs();
  }
}

/* Resize and re-compress in the browser so a 5MB phone photo becomes ~200KB. */
function shrink(file, maxSide = 1600, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        if (Math.max(w, h) > maxSide) {
          const r = maxSide / Math.max(w, h);
          w = Math.round(w * r); h = Math.round(h * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadToHost(dataUrl) {
  const body = new FormData();
  body.append("image", dataUrl.split(",")[1]);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${CONFIG.imgbbKey}`, {
    method: "POST", body,
  });
  const out = await res.json();
  if (!out.success) throw new Error("upload failed");
  return out.data.url;
}

function drawThumbs() {
  const wrap = document.getElementById("thumbs");
  if (!wrap) return;
  wrap.innerHTML = PHOTOS.map((p, i) => `
    <div class="thumb">
      <img src="${p.dataUrl}" alt="">
      ${p.uploading ? '<span class="busy">…</span>' : ""}
      <button type="button" data-i="${i}" aria-label="Remove this photo">&times;</button>
    </div>`).join("");
  wrap.querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => { PHOTOS.splice(Number(b.dataset.i), 1); drawThumbs(); }));
}

/* ---- before / after slider ---------------------------------------------- */
function wireCompare() {
  const box = document.getElementById("compare");
  if (!box) return;
  const stage  = box.classList.contains("compare-stage") ? box : box.querySelector(".compare-stage");
  const clip   = document.getElementById("cmp-clip");
  const handle = document.getElementById("cmp-handle");
  const inner  = clip.querySelector("img");
  let pct = 42, dragging = false, touched = false;

  const sizeInner = () => { inner.style.width = stage.clientWidth + "px"; };
  const paint = () => {
    clip.style.width  = pct + "%";
    handle.style.left = pct + "%";
    handle.setAttribute("aria-valuenow", Math.round(pct));
  };

  const fromX = (x) => {
    const r = stage.getBoundingClientRect();
    pct = Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100));
    paint();
  };

  stage.addEventListener("pointerdown", (e) => {
    dragging = true; touched = true;
    stage.setPointerCapture(e.pointerId);
    fromX(e.clientX);
  });
  stage.addEventListener("pointermove", (e) => { if (dragging) fromX(e.clientX); });
  ["pointerup", "pointercancel"].forEach(ev =>
    stage.addEventListener(ev, () => { dragging = false; }));

  handle.addEventListener("keydown", (e) => {
    touched = true;
    const step = e.shiftKey ? 10 : 4;
    if (e.key === "ArrowLeft")  { pct = Math.max(0, pct - step);   paint(); e.preventDefault(); }
    if (e.key === "ArrowRight") { pct = Math.min(100, pct + step); paint(); e.preventDefault(); }
    if (e.key === "Home")       { pct = 0;   paint(); e.preventDefault(); }
    if (e.key === "End")        { pct = 100; paint(); e.preventDefault(); }
  });

  window.addEventListener("resize", sizeInner, { passive: true });
  if (inner.complete) sizeInner(); else inner.addEventListener("load", sizeInner);
  sizeInner();
  paint();

  // nudge it once on first view so people see it is draggable
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        io.disconnect();
        let t = 0;
        const tick = setInterval(() => {
          if (touched) { clearInterval(tick); return; }
          t += 1;
          pct = 42 + Math.sin(t / 3.4) * 13 * Math.max(0, 1 - t / 24);
          paint();
          if (t > 24) { clearInterval(tick); if (!touched) { pct = 42; paint(); } }
        }, 28);
      });
    }, { threshold: 0.45 });
    io.observe(box);
  }
}

/* ---- shade picker -------------------------------------------------------- */
let CHOSEN_SHADE = null;

function wireShades() {
  const chips = document.querySelectorAll(".shade-picker .chip");
  const img   = document.getElementById("shade-img");
  const rtag  = document.getElementById("cmp-tag-r");
  const name  = document.getElementById("shade-name");
  const note  = document.getElementById("shade-note");
  const ask   = document.getElementById("shade-send");
  if (!chips.length || !img) return;

  chips.forEach(c => {
    c.style.setProperty("--sw", c.dataset.hex);
    // preload so the swap is instant
    const pre = new Image(); pre.src = `assets/shades/${c.dataset.slug}.jpg`;

    c.addEventListener("click", () => {
      chips.forEach(o => o.classList.remove("is-on"));
      c.classList.add("is-on");
      CHOSEN_SHADE = c.dataset.name;

      img.classList.add("swapping");
      const next = new Image();
      next.onload = () => {
        img.src = next.src;
        img.alt = `Painted brick shown in ${c.dataset.name}`;
        img.classList.remove("swapping");
      };
      next.src = `assets/shades/${c.dataset.slug}.jpg`;

      name.textContent = c.dataset.name;
      note.textContent = c.dataset.note;
      if (rtag) rtag.textContent = c.dataset.name;
    });
  });

  if (ask) ask.addEventListener("click", () => {
    const shade = CHOSEN_SHADE || "Mortar White";
    prefill({
      project: "Painted brick",
      body: `We were looking at ${shade} on the colour picker and would like to know what that would cost on ours.`,
    });
  });
}

/* ---- quiz ---------------------------------------------------------------- */
const ANSWERS = {};

function wireQuiz() {
  const box = document.getElementById("quiz-box");
  if (!box) return;
  const steps = [...box.querySelectorAll(".q-step")];
  const fill  = document.getElementById("q-fill");

  const show = (n) => {
    steps.forEach(s => s.classList.toggle("is-on", Number(s.dataset.step) === n));
    fill.style.width = ((n - 1) / 3) * 100 + "%";
  };

  box.querySelectorAll(".q-opt").forEach(btn => {
    btn.addEventListener("click", () => {
      ANSWERS[btn.dataset.k] = btn.dataset.v;
      const cur = Number(btn.closest(".q-step").dataset.step);
      if (cur < 3) { show(cur + 1); return; }
      const r = recommend(ANSWERS);
      document.getElementById("q-title").textContent  = r.title;
      document.getElementById("q-body").textContent   = r.body;
      document.getElementById("q-caveat").textContent = r.caveat;
      show(4);
      box.dataset.rec = r.project;
      box.dataset.recTitle = r.title;
    });
  });

  document.getElementById("q-again").addEventListener("click", () => {
    Object.keys(ANSWERS).forEach(k => delete ANSWERS[k]);
    show(1);
  });

  document.getElementById("q-send").addEventListener("click", () => {
    prefill({
      project: box.dataset.rec || "Honestly not sure",
      body: `The three questions on your site suggested: ${box.dataset.recTitle}. Does that sound right for ours?`,
    });
  });

  show(1);
}

function recommend(a) {
  const { issue, material, texture } = a;

  if (issue === "mantel") return {
    title: "The mantel on its own",
    project: "A wood mantel",
    body: "If the surround itself does not bother you, there is no reason to touch it. A mantel restained to something deeper and more even, or painted out entirely, is a smaller job and often the only thing the room needed.",
    caveat: "Worth sending a photo before you commit to the brick staying as it is — sometimes the two read differently together than they do apart.",
  };

  if (texture === "keep") return {
    title: material === "stone" ? "Limewash on the stone" : "Limewash rather than paint",
    project: "Whitewash or limewash",
    body: "You want the colour down but the character kept, which is exactly what limewash is for. It is thinner and worked in, so the variation underneath still shows through instead of being covered flat.",
    caveat: "It is also the more forgiving choice if you are nervous. Less absolute than paint.",
  };

  if (issue === "heavy") return {
    title: "Painted, in something light",
    project: "Painted brick",
    body: "A dark, heavy fireplace is almost always the colour rather than the size. Taking it to a soft white or a warm linen lifts the whole wall, and the mantel becomes the thing you notice instead of the mass of brick.",
    caveat: "If the room gets very little daylight, warm linen tends to sit better than a pure white.",
  };

  if (issue === "colour") return {
    title: "Painted brick",
    project: "Painted brick",
    body: material === "tile"
      ? "Tile takes a different product than brick, but the principle is the same — refinished in place, no ripping out, no tile saw in the driveway."
      : "Straightforward one. Orange or blotchy brick becomes one even surface, and the colour decides how bold it reads. The picker above is a fair guide to what each shade does.",
    caveat: "Painting is close to permanent. Worth being sure, and worth seeing a sample on your own wall first.",
  };

  return {
    title: "Send a photo before deciding anything",
    project: "Honestly not sure",
    body: "When you cannot name what is wrong, it is usually one of three things — the colour, the mantel, or the proportion. A photo sorts that out in about a minute, and we will tell you which one it is.",
    caveat: "Sometimes the answer is that it is fine and the room needs something else entirely. We will say so.",
  };
}

/* ---- shared: push a suggestion into the form and go there ---------------- */
function prefill({ project, body }) {
  const sel = document.getElementById("b5");
  const txt = document.getElementById("b6");
  if (sel && project) {
    const hit = [...sel.options].find(o => o.text === project);
    if (hit) sel.value = hit.value || hit.text;
  }
  if (txt && body && !txt.value.trim()) txt.value = body;

  const target = document.getElementById("contact");
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => { document.getElementById("b1")?.focus({ preventScroll: true }); }, 650);
}

/* ---- contact form ------------------------------------------------------- */
function wireForm() {
  const form   = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  const btn    = document.getElementById("submit-btn");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors(form);

    const data = Object.fromEntries(new FormData(form).entries());
    const problems = validate(data);

    if (problems.length) {
      problems.forEach(p => markError(form, p.field, p.message));
      setStatus(status, "Just a couple of bits missing below.", "err");
      form.querySelector(".f.invalid input, .f.invalid textarea")?.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = "Sending…";
    setStatus(status, "", "");

    try {
      // Prefer the real backend (saves to the dashboard). Fall back to the
      // relay only if it genuinely is not deployed here.
      let res, out = {}, ok = false, viaRelay = false;

      if (BACKEND_PRESENT !== false) {
        try {
          res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ ...data, photos: PHOTOS.filter(p => p.dataUrl).map(p => ({ name: p.name, dataUrl: p.dataUrl })) }),
          });
          if (res.status === 404 || res.status === 405) {
            BACKEND_PRESENT = false;
          } else {
            out = await res.json().catch(() => ({}));
            ok = res.ok && out.ok;
            BACKEND_PRESENT = true;
          }
        } catch { BACKEND_PRESENT = false; }
      }

      if (!ok && BACKEND_PRESENT === false && CONFIG.web3formsKey) {
        viaRelay = true;
        res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: CONFIG.web3formsKey,
            subject: `Fireplace enquiry from ${data.name}${data.city ? " in " + data.city : ""}`,
            from_name: "Fireplace Face Lifts website",
            name: data.name,
            email: data.email,
            phone: data.phone || "not given",
            town: data.city || "not given",
            project: data.project || "not said",
            message: data.body + photoLines(),
            botcheck: data.website || "",
          }),
        });
        out = await res.json().catch(() => ({}));
        ok = Boolean(out.success);
      }

      if (!ok) throw new Error(out.message || out.error || "Something went wrong.");

      form.reset();
      PHOTOS.length = 0; drawThumbs();
      setStatus(status, "Got it, thank you. We'll have a look and write back to you.", "ok");
      btn.textContent = "Sent";
    } catch (err) {
      setStatus(status, CONFIG.email
        ? `That didn't go through. Email us at ${CONFIG.email} instead and we'll pick it up.`
        : "That didn't go through. Give it another try in a moment.", "err");
      btn.disabled = false;
      btn.textContent = "Send message";
    }
  });
}

function photoLines() {
  const links = PHOTOS.filter(p => p.url).map(p => p.url);
  if (links.length) return "\n\nPhotos:\n" + links.join("\n");
  if (PHOTOS.length) return "\n\n(They tried to attach a photo but it didn't upload — ask them to reply with it.)";
  return "";
}

function validate(d) {
  const out = [];
  if (!d.name || d.name.trim().length < 2)
    out.push({ field: "name", message: "What should we call you?" });
  if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()))
    out.push({ field: "email", message: "We'll need somewhere to write back to." });
  if (!d.body || d.body.trim().length < 10)
    out.push({ field: "body", message: "A line or two about the fireplace and we're set." });
  return out;
}

function markError(form, fieldName, message) {
  const input = form.querySelector(`[name="${fieldName}"]`);
  if (!input) return;
  const wrap = input.closest(".f");
  wrap?.classList.add("invalid");
  input.setAttribute("aria-invalid", "true");
  if (wrap && !wrap.querySelector(".field-error")) {
    const p = document.createElement("p");
    p.className = "field-error";
    p.textContent = message;
    wrap.appendChild(p);
  }
}

function clearErrors(form) {
  form.querySelectorAll(".f.invalid").forEach(w => w.classList.remove("invalid"));
  form.querySelectorAll(".field-error").forEach(e => e.remove());
  form.querySelectorAll("[aria-invalid]").forEach(i => i.removeAttribute("aria-invalid"));
}

function setStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = "form-status" + (kind ? " " + kind : "");
}
