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
