/* Shared shell: theme, sidebar, voice, toasts, settings */
(function () {
  const root = document.documentElement;
  const saved = Store.get('settings', {});
  root.setAttribute('data-theme', saved.theme || 'light');

  window.toast = (msg, kind = '') => {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
    box.appendChild(t); setTimeout(() => t.remove(), 3800);
  };

  window.toggleSidebar = () => document.querySelector('.sidebar')?.classList.toggle('open');

  window.setTheme = (th) => {
    root.setAttribute('data-theme', th);
    const s = Store.get('settings', {}); s.theme = th; Store.set('settings', s);
    document.querySelectorAll('[data-theme-toggle]').forEach(b => b.textContent = th === 'dark' ? '☀️ Light' : '🌙 Dark');
  };

  document.addEventListener('DOMContentLoaded', () => {
    // active nav
    const page = document.body.dataset.page;
    document.querySelectorAll('.side-link,.bottomnav a').forEach(a => {
      if (a.dataset.nav === page) a.classList.add('active');
    });
    document.querySelectorAll('[data-theme-toggle]').forEach(b => {
      b.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️ Light' : '🌙 Dark';
      b.onclick = () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
    Progress.bumpStudyMinutes(0); // ensures stats exist + streak entry
    const st = Store.get('stats', {}); st.streak = st.streak || {}; st.streak[Store.today()] = true; Store.set('stats', st);
  });

  // ---- Voice ----
  window.Voice = {
    supported() { return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window); },
    listen(onText, onError) {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { onError?.('Voice input is not supported in this browser. Try Chrome/Edge.'); return null; }
      try {
        const r = new SR(); r.lang = 'en-US'; r.interimResults = false;
        r.onresult = e => onText?.(e.results[0][0].transcript);
        r.onerror = e => onError?.('Voice error: ' + e.error);
        r.start(); return r;
      } catch (e) { onError?.('Could not start microphone. Check permission.'); return null; }
    },
    speak(text) {
      try {
        const s = Store.get('settings', {});
        if (s.voiceOff) return;
        if (!('speechSynthesis' in window)) { toast('Text-to-speech not supported in this browser'); return; }
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ' ').slice(0, 600));
        speechSynthesis.speak(u);
      } catch { toast('Speech failed', 'err'); }
    }
  };

  window.copyHtml = async (elId) => {
    const el = document.getElementById(elId); if (!el) return;
    try { await navigator.clipboard.writeText(el.innerText); toast('Copied ✓', 'ok'); }
    catch { toast('Copy blocked by browser', 'err'); }
  };
  window.downloadText = (elId, name) => {
    const el = document.getElementById(elId); if (!el) return;
    const blob = new Blob([el.innerText], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name || 'notes.txt'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
})();
