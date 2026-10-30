/* "Ask Ash" on the Fireplace Face Lifts site. Ash is the assistant across everything
   Aether & Ash builds. Answers come from POST /api/ash, which reads only this site's
   public homepage. Anything Ash can't answer goes to the quote form already on the page. */
(function () {
  if (document.getElementById('ashRoot')) return;
  var SUGGEST = ['What can you do with my fireplace?', 'What area do you serve?', 'How do I get a quote?', 'How long does a project take?'];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var css = document.createElement('style');
  css.textContent = [
    '#ashRoot{--a-bg:var(--clay-2,#F1EBE2);--a-fg:var(--ink,#2B221C);--a-mut:var(--ink-3,#8B7C6F);--a-line:var(--rule,rgba(43,34,28,.16));--a-acc:var(--brick,#9B3A26);--a-acc2:var(--brick-deep,#7A2C1B);font-family:"Work Sans",system-ui,sans-serif}',
    '#ashRoot [hidden]{display:none!important}',
    '.ash-fab{position:fixed;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:60;display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;border:0;background:var(--a-acc);color:#fff;font:inherit;font-weight:600;font-size:15px;cursor:pointer;box-shadow:0 2px 4px rgba(70,50,36,.08),0 14px 34px rgba(70,50,36,.22);min-height:48px}',
    '.ash-fab:hover{background:var(--a-acc2)}',
    '.ash-panel{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));z-index:61;width:min(390px,calc(100vw - 24px));max-height:min(600px,calc(100vh - 24px));display:flex;flex-direction:column;background:var(--a-bg);color:var(--a-fg);border:1px solid var(--a-line);border-radius:10px;overflow:hidden;box-shadow:0 2px 4px rgba(70,50,36,.05),0 22px 50px rgba(70,50,36,.22)}',
    '.ash-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid var(--a-line);background:#fff}',
    '.ash-head b{font-family:Bitter,Georgia,serif;font-weight:600;font-size:17px}.ash-head small{display:block;font-size:12.5px;color:var(--a-mut)}',
    '.ash-x{font:inherit;background:none;border:0;color:var(--a-fg);font-size:22px;line-height:1;cursor:pointer;min-width:40px;min-height:40px}',
    '.ash-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px}',
    '.ash-m{max-width:88%;padding:9px 12px;border-radius:9px;font-size:15px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}',
    '.ash-m.bot{align-self:flex-start;background:#fff;border:1px solid var(--a-line)}',
    '.ash-m.you{align-self:flex-end;background:var(--a-fg);color:#fff}',
    '.ash-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.ash-chips button,.ash-link{font:inherit;font-size:13.5px;border:1px solid var(--a-line);background:#fff;color:var(--a-fg);border-radius:999px;padding:6px 12px;cursor:pointer;min-height:34px}',
    '.ash-in{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--a-line);background:#fff}',
    '.ash-in input{flex:1;font:inherit;font-size:16px;padding:10px 12px;border-radius:6px;border:1px solid var(--a-line);background:var(--a-bg);color:var(--a-fg)}',
    '.ash-go{font:inherit;font-weight:600;border:0;background:var(--a-acc);color:#fff;border-radius:6px;padding:0 16px;cursor:pointer;min-height:44px}',
    '.ash-foot{padding:0 12px 10px;background:#fff}',
    '#ashRoot button:focus-visible,#ashRoot input:focus-visible,#ashRoot a:focus-visible{outline:3px solid var(--a-acc);outline-offset:2px}'
  ].join('\n');
  document.head.appendChild(css);

  var root = document.createElement('div');
  root.id = 'ashRoot';
  root.innerHTML =
    '<button class="ash-fab" id="ashFab" type="button" aria-expanded="false" aria-controls="ashPanel">Ask Ash</button>' +
    '<section class="ash-panel" id="ashPanel" role="dialog" aria-labelledby="ashTitle" hidden>' +
      '<div class="ash-head"><div><b id="ashTitle">Ask Ash</b><small>Questions about your fireplace</small></div><button class="ash-x" id="ashClose" type="button" aria-label="Close">×</button></div>' +
      '<div class="ash-log" id="ashLog" aria-live="polite">' +
        '<div class="ash-m bot">Hi, I’m Ash. Ask me about what we do with fireplaces, the looks we offer, where we work, or how a quote works. You can write in any language. For an exact answer on your fireplace, send us a photo with the free quote form.</div>' +
        '<div class="ash-chips" id="ashChips">' + SUGGEST.map(function (s) { return '<button type="button">' + esc(s) + '</button>'; }).join('') + '</div>' +
      '</div>' +
      '<form class="ash-in" id="ashIn" autocomplete="off"><input id="ashText" maxlength="600" placeholder="Ask Ash…" aria-label="Your question" dir="auto"><button class="ash-go" type="submit">Ask</button></form>' +
      '<div class="ash-foot"><button type="button" class="ash-link" id="ashQuote">Get a free quote</button></div>' +
    '</section>';
  document.body.appendChild(root);

  var $ = function (id) { return document.getElementById(id); };
  var fab = $('ashFab'), panel = $('ashPanel'), log = $('ashLog'), history = [], busy = false;
  function open(on) { panel.hidden = !on; fab.hidden = on; fab.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) $('ashText').focus(); else fab.focus(); }
  fab.addEventListener('click', function () { open(true); });
  $('ashClose').addEventListener('click', function () { open(false); });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
  $('ashQuote').addEventListener('click', function () {
    open(false);
    var c = document.getElementById('contact');
    if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); var f = c.querySelector('input,textarea'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 500); }
  });
  function add(cls, text) { var d = document.createElement('div'); d.className = 'ash-m ' + cls; d.setAttribute('dir', 'auto'); d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  async function ask(q) {
    if (busy || !q.trim()) return;
    var chips = $('ashChips'); if (chips) chips.remove();
    busy = true; add('you', q); history.push({ role: 'user', content: q });
    var wait = add('bot', '…');
    try {
      var r = await fetch('/api/ash', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history }) });
      var j = await r.json();
      if (j && j.reply && !j.fallback) { wait.textContent = j.reply; history.push({ role: 'assistant', content: j.reply }); }
      else wait.textContent = (j && j.reply) || 'I can’t answer that right now. Tap Get a free quote and we’ll answer directly.';
    } catch (e) { wait.textContent = 'That didn’t go through. Tap Get a free quote and we’ll answer directly.'; }
    busy = false;
  }
  log.addEventListener('click', function (e) { var b = e.target.closest('.ash-chips button'); if (b) ask(b.textContent); });
  $('ashIn').addEventListener('submit', function (e) { e.preventDefault(); var v = $('ashText').value; $('ashText').value = ''; ask(v); });
})();
