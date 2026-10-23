/* Fireplace Facelifts — dashboard behaviour */

let MESSAGES = [];
let FILTER = "all";

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("gate-form").addEventListener("submit", signIn);
  document.getElementById("refresh-btn").addEventListener("click", () => load(true));
  document.getElementById("signout-btn").addEventListener("click", signOut);

  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("is-active"));
      chip.classList.add("is-active");
      FILTER = chip.dataset.filter;
      render();
    });
  });

  // Already signed in? Go straight through.
  load(false);
});

/* ---- auth --------------------------------------------------------------- */
async function signIn(e) {
  e.preventDefault();
  const pw     = document.getElementById("pw").value;
  const btn    = document.getElementById("gate-btn");
  const status = document.getElementById("gate-status");

  btn.disabled = true;
  btn.textContent = "Signing in…";
  status.textContent = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) throw new Error("That password didn't work. Try again.");
    document.getElementById("pw").value = "";
    await load(true);
  } catch (err) {
    status.textContent = err.message;
    status.className = "form-status err";
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
}

async function signOut() {
  await fetch("/api/login", { method: "DELETE" }).catch(() => {});
  MESSAGES = [];
  document.getElementById("dash").hidden = true;
  document.getElementById("gate").hidden = false;
}

/* ---- load --------------------------------------------------------------- */
async function load(showErrors) {
  try {
    const res = await fetch("/api/messages", { headers: { Accept: "application/json" } });
    if (res.status === 401) {
      document.getElementById("gate").hidden = false;
      document.getElementById("dash").hidden = true;
      return;
    }
    if (!res.ok) throw new Error("Couldn't load your messages.");

    const data = await res.json();
    MESSAGES = data.messages || [];

    document.getElementById("gate").hidden = true;
    document.getElementById("dash").hidden = false;
    render();
  } catch (err) {
    if (showErrors) {
      const status = document.getElementById("gate-status");
      status.textContent = err.message;
      status.className = "form-status err";
    }
  }
}

/* ---- render ------------------------------------------------------------- */
function render() {
  const list  = document.getElementById("msg-list");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("count-line");

  const shown = MESSAGES.filter(m => FILTER === "all" || m.status === FILTER);
  const newCount = MESSAGES.filter(m => m.status === "new").length;

  count.textContent = MESSAGES.length === 0
    ? "No messages yet"
    : `${MESSAGES.length} message${MESSAGES.length === 1 ? "" : "s"}` +
      (newCount ? ` · ${newCount} waiting for a reply` : " · all answered");

  if (!shown.length) {
    list.innerHTML = "";
    empty.hidden = false;
    empty.textContent = MESSAGES.length
      ? "Nothing in this view."
      : "Nothing here yet. When someone fills in the form on your website, it lands right here.";
    return;
  }

  empty.hidden = true;
  list.innerHTML = shown.map(cardHtml).join("");

  list.querySelectorAll(".msg-top").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".msg").classList.toggle("is-open"));
  });
  list.querySelectorAll(".reply-form").forEach(f => {
    f.addEventListener("submit", sendReply);
  });
}

function cardHtml(m) {
  const isNew = m.status === "new";
  const facts = [];
  if (m.email) facts.push(`<span class="fact"><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span>`);
  if (m.phone) facts.push(`<span class="fact"><a href="tel:${esc(m.phone.replace(/[^\d+]/g, ""))}">${esc(m.phone)}</a></span>`);
  if (m.city) facts.push(`<span class="fact">${esc(m.city)}</span>`);
  if (m.project) facts.push(`<span class="fact">${esc(m.project)}</span>`);

  const thread = (m.replies || []).map(r => `
    <div class="thread-item ${r.delivery_status === "failed" ? "thread-fail" : ""}">
      <p class="thread-head">
        ${r.delivery_status === "failed" ? "Did not send" : "You replied"} · ${when(r.created_at)}
      </p>
      <p class="thread-body">${esc(r.body)}</p>
      ${r.delivery_status === "failed" ? `<p class="thread-body"><em>Try sending this again.</em></p>` : ""}
    </div>
  `).join("");

  return `
    <article class="msg ${isNew ? "is-new" : ""}" data-id="${m.id}">
      <button class="msg-top" aria-expanded="false">
        <span class="msg-id">${esc((m.name || "?").trim().charAt(0).toUpperCase())}</span>
        <span class="msg-main">
          <span class="msg-name">${esc(m.name)}</span>
          <p class="msg-meta">${when(m.created_at)}${m.city ? " · " + esc(m.city) : ""}</p>
          <p class="msg-snip">${esc(m.body)}</p>
        </span>
        <span class="msg-right">
          <span class="tag ${isNew ? "tag-new" : "tag-answered"}">${isNew ? "New" : "Answered"}</span>
          <span class="caret" aria-hidden="true">⌄</span>
        </span>
      </button>

      <div class="msg-detail">
        <div class="detail-facts">${facts.join("")}</div>
        <p class="detail-body">${esc(m.body)}</p>
        ${thread ? `<div class="thread">${thread}</div>` : ""}

        <form class="reply-form" data-id="${m.id}">
          <label class="reply-label" for="reply-${m.id}">Write back</label>
          <p class="reply-hint">This goes straight to ${esc(m.email)} from the business email address.</p>
          <textarea id="reply-${m.id}" rows="5" required
            placeholder="Hi ${esc((m.name || "").split(" ")[0])} — thanks for getting in touch…"></textarea>
          <div class="reply-actions">
            <button class="btn btn-primary btn-sm" type="submit">Send reply</button>
            <p class="reply-status" role="status" aria-live="polite"></p>
          </div>
        </form>
      </div>
    </article>
  `;
}

/* ---- reply -------------------------------------------------------------- */
async function sendReply(e) {
  e.preventDefault();
  const form   = e.currentTarget;
  const id     = form.dataset.id;
  const ta     = form.querySelector("textarea");
  const btn    = form.querySelector("button");
  const status = form.querySelector(".reply-status");
  const body   = ta.value.trim();

  if (body.length < 2) {
    status.textContent = "Write something first.";
    status.className = "reply-status err";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending…";
  status.textContent = "";
  status.className = "reply-status";

  try {
    const res = await fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: Number(id), body }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || "That didn't send.");

    status.textContent = "Sent.";
    status.className = "reply-status ok";
    ta.value = "";
    setTimeout(() => load(false), 700);
  } catch (err) {
    status.textContent = err.message + " Your words are still here — try again.";
    status.className = "reply-status err";
    btn.disabled = false;
    btn.textContent = "Send reply";
  }
}

/* ---- helpers ------------------------------------------------------------ */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (isNaN(d)) return iso;

  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1)    return "Just now";
  if (mins < 60)   return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24)    return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days < 7)    return `${days} day${days === 1 ? "" : "s"} ago`;

  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles",
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Tabs, the photo uploader, and review moderation
   ══════════════════════════════════════════════════════════════════════ */

let GALLERY = [];
let REVIEWS = [];
const PENDING_UPLOAD = { before: null, after: null };

document.addEventListener("DOMContentLoaded", () => {
  wireTabs();
  wireUploader();
  wireReviewLink();
});

/* ---- tabs ---------------------------------------------------------------- */
function wireTabs() {
  const tabs = document.querySelectorAll(".tab");
  if (!tabs.length) return;
  tabs.forEach(t => {
    t.addEventListener("click", () => {
      tabs.forEach(o => { o.classList.remove("is-on"); o.setAttribute("aria-selected", "false"); });
      t.classList.add("is-on"); t.setAttribute("aria-selected", "true");
      document.querySelectorAll(".pane").forEach(p =>
        p.classList.toggle("is-on", p.dataset.pane === t.dataset.tab));

      // the message filters only make sense on the messages tab
      const f = document.getElementById("msg-filters");
      if (f) f.style.display = t.dataset.tab === "messages" ? "" : "none";

      if (t.dataset.tab === "photos")  loadGallery();
      if (t.dataset.tab === "reviews") loadReviews();
    });
  });
}

/* ---- photo uploading ----------------------------------------------------- */
function wireUploader() {
  ["before", "after"].forEach(side => {
    const input = document.getElementById(`up-${side}`);
    const drop  = document.getElementById(`up-${side}-drop`);
    if (!input || !drop) return;

    input.addEventListener("change", () => { takeFile(side, input.files[0]); input.value = ""; });
    ["dragenter", "dragover"].forEach(e =>
      drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(e =>
      drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", ev => takeFile(side, ev.dataTransfer?.files?.[0]));
  });

  document.getElementById("up-save")?.addEventListener("click", saveUpload);
}

async function takeFile(side, file) {
  if (!file || !file.type.startsWith("image/")) return;
  const label = document.getElementById(`up-${side}-label`);
  const drop  = document.getElementById(`up-${side}-drop`);
  label.textContent = "Getting it ready…";

  // Phone photos are 4–8MB. Shrink before upload so it works on a weak signal.
  PENDING_UPLOAD[side] = await shrinkImage(file, 1800, 0.8);
  document.getElementById(`up-${side}-prev`).innerHTML =
    `<img src="${PENDING_UPLOAD[side]}" alt="">`;
  label.textContent = side === "before" ? "Before photo ready" : "After photo ready";
  drop.classList.add("has");
}

function shrinkImage(file, maxSide = 1800, quality = 0.8) {
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
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveUpload() {
  const btn    = document.getElementById("up-save");
  const status = document.getElementById("up-status");
  const setMsg = (t, k) => { status.textContent = t; status.className = "form-status" + (k ? " " + k : ""); };

  if (!PENDING_UPLOAD.before || !PENDING_UPLOAD.after) {
    setMsg("Both photos first — one before, one after.", "err");
    return;
  }

  btn.disabled = true; btn.textContent = "Adding…"; setMsg("", "");
  try {
    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        before: PENDING_UPLOAD.before,
        after:  PENDING_UPLOAD.after,
        town:    document.getElementById("up-town").value,
        caption: document.getElementById("up-caption").value,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || "That didn't save.");

    PENDING_UPLOAD.before = PENDING_UPLOAD.after = null;
    ["before", "after"].forEach(s => {
      document.getElementById(`up-${s}-prev`).innerHTML = "";
      document.getElementById(`up-${s}-drop`).classList.remove("has");
      document.getElementById(`up-${s}-label`).textContent =
        s === "before" ? "Choose the before photo" : "Choose the after photo";
    });
    document.getElementById("up-town").value = "";
    document.getElementById("up-caption").value = "";
    setMsg("Added. It's on the website now.", "ok");
    loadGallery();
  } catch (err) {
    setMsg(err.message + " Your photos are still here — try again.", "err");
  } finally {
    btn.disabled = false; btn.textContent = "Add it to the website";
  }
}

async function loadGallery() {
  const list  = document.getElementById("gal-list");
  const empty = document.getElementById("gal-empty");
  if (!list) return;
  try {
    const res = await fetch("/api/photos", { headers: { Accept: "application/json" } });
    const out = await res.json();
    GALLERY = out.photos || [];
  } catch { GALLERY = []; }

  empty.hidden = GALLERY.length > 0;
  list.innerHTML = GALLERY.map(g => `
    <div class="gal-item">
      <div class="gal-thumbs">
        <img src="${esc(g.before)}" alt="" loading="lazy">
        <img src="${esc(g.after)}" alt="" loading="lazy">
      </div>
      <div class="gal-meta">
        <p class="gal-cap">${esc(g.caption || "No caption")}</p>
        <p class="gal-town">${esc(g.town || "No town")}</p>
      </div>
      <button class="btn btn-quiet btn-sm btn-danger" data-del="${g.id}" type="button">Remove</button>
    </div>`).join("");

  list.querySelectorAll("[data-del]").forEach(b =>
    b.addEventListener("click", () => removePhoto(Number(b.dataset.del), b)));
}

async function removePhoto(id, btn) {
  btn.disabled = true; btn.textContent = "Removing…";
  try {
    const res = await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error();
    loadGallery();
  } catch {
    btn.disabled = false; btn.textContent = "Remove";
  }
}

/* ---- reviews ------------------------------------------------------------- */
function wireReviewLink() {
  const box = document.getElementById("rev-link");
  if (box) box.value = `${location.origin}/review/`;
  document.getElementById("rev-copy")?.addEventListener("click", async (e) => {
    try {
      await navigator.clipboard.writeText(box.value);
      e.target.textContent = "Copied";
      setTimeout(() => { e.target.textContent = "Copy"; }, 1600);
    } catch {
      box.select();
    }
  });
}

async function loadReviews() {
  const list  = document.getElementById("rev-list");
  const empty = document.getElementById("rev-empty");
  if (!list) return;
  try {
    const res = await fetch("/api/reviews", { headers: { Accept: "application/json" } });
    const out = await res.json();
    REVIEWS = out.reviews || [];
  } catch { REVIEWS = []; }

  empty.hidden = REVIEWS.length > 0;
  list.innerHTML = REVIEWS.map(r => {
    const st = r.status || "approved";
    return `
    <div class="rev-item ${st === "pending" ? "pending" : ""}">
      <div class="rev-top">
        <span class="rev-name">${esc(r.name)}</span>
        ${r.town ? `<span class="rev-town">${esc(r.town)}</span>` : ""}
        ${r.rating ? `<span class="rev-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>` : ""}
        <span class="pill-state pill-${st}">${st}</span>
      </div>
      <p class="rev-body">${esc(r.body)}</p>
      <div class="rev-actions">
        ${st !== "approved" ? `<button class="btn btn-primary btn-sm" data-ok="${r.id}" type="button">Put it on the website</button>` : ""}
        ${st === "approved" ? `<button class="btn btn-quiet btn-sm" data-hide="${r.id}" type="button">Take it down</button>` : ""}
        <button class="btn btn-quiet btn-sm btn-danger" data-rdel="${r.id}" type="button">Delete</button>
      </div>
    </div>`;
  }).join("");

  list.querySelectorAll("[data-ok]").forEach(b =>
    b.addEventListener("click", () => setReview(Number(b.dataset.ok), "approved", b)));
  list.querySelectorAll("[data-hide]").forEach(b =>
    b.addEventListener("click", () => setReview(Number(b.dataset.hide), "hidden", b)));
  list.querySelectorAll("[data-rdel]").forEach(b =>
    b.addEventListener("click", () => deleteReview(Number(b.dataset.rdel), b)));
}

async function setReview(id, status, btn) {
  btn.disabled = true; btn.textContent = "…";
  try {
    await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadReviews();
  } catch { btn.disabled = false; }
}

async function deleteReview(id, btn) {
  btn.disabled = true; btn.textContent = "…";
  try {
    await fetch("/api/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadReviews();
  } catch { btn.disabled = false; }
}
