/* ============================================================
   AI engine: tries secure backend first, falls back to built-in
   SmartTutor (fully offline, real rule-based tutoring engine).
   Backend contract (optional, keeps keys server-side):
     POST {endpoint}  body {messages:[{role,content}], mode}
     -> { reply: "markdown-ish text" }
   Configure endpoint + key in Settings (endpoint stored locally,
   key only sent to your own backend, never to a third party).
   ============================================================ */
const AIEngine = (() => {
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const settings = () => Store.get('settings', {});

  // ---------- language helpers ----------
  function langIntro(lang, topic) {
    if (lang === 'ta') return `📌 <b>${esc(topic)}</b> பற்றி எளிய தமிழில் கற்றுக்கொள்வோம்.`;
    if (lang === 'tanglish') return `📌 <b>${esc(topic)}</b> pathi eliya Tanglish-la kathukalam.`;
    return `📌 Let's master <b>${esc(topic)}</b> step by step.`;
  }
  function langLine(lang, en, ta, tanglish) {
    if (lang === 'ta') return ta; if (lang === 'tanglish') return tanglish; return en;
  }

  // ---------- knowledge base (sample + generic) ----------
  const KB = {
    'java arrays': {
      definition: 'An array in Java is a fixed-size container that stores multiple values of the same data type in contiguous memory, accessed by an index starting at 0.',
      analogy: 'Think of an array like a row of lockers: each locker (index) holds one item, and you open locker 0, 1, 2… to get your things.',
      points: ['Index starts at 0, ends at length-1', 'Length is fixed after creation (array.length)', 'All elements share one data type', 'Default values: 0 for int, null for objects', 'ArrayList is resizable; arrays are fixed'],
      code: `int[] marks = {85, 90, 78};\nSystem.out.println(marks[0]); // 85\n// largest element\nint max = marks[0];\nfor (int m : marks) if (m > max) max = m;\nSystem.out.println("Max = " + max);`,
      mistakes: ['Using index == length (causes ArrayIndexOutOfBoundsException)', 'Confusing array.length (field) with String.length() (method)', 'Forgetting arrays are fixed-size — use ArrayList for dynamic size'],
      practice: 'Write a Java program to reverse an array in place without using a second array.'
    },
    'recursion': {
      definition: 'Recursion is when a function calls itself to solve a smaller version of the same problem, until it reaches a base case that stops the calls.',
      analogy: 'Like Russian nesting dolls: each doll contains a smaller doll until you reach the tiniest one (base case), then you build back up.',
      points: ['Every recursion needs a BASE CASE', 'Each call must move toward the base case', 'Uses the call stack — too deep = StackOverflowError', 'Great for trees, factorial, Fibonacci, divide & conquer'],
      code: `int factorial(int n) {\n  if (n <= 1) return 1;      // base case\n  return n * factorial(n-1); // smaller problem\n}`,
      mistakes: ['Missing base case → infinite recursion', 'Not shrinking the problem each call', 'Using recursion where a simple loop is clearer'],
      practice: 'Trace factorial(4) call by call and write the stack of return values.'
    }
  };
  const kbFind = (text) => {
    const t = text.toLowerCase();
    if (/recurs/.test(t)) return KB['recursion'];
    if (/array/.test(t)) return KB['java arrays'];
    return null;
  };
  const isCodeSubject = s => /java|python|javascript|js|c\+\+|c |programming|coding|dsa/i.test(s || '');

  function codeFor(subject, topic) {
    if (/java/i.test(subject)) return `// ${topic} — Java example\npublic class Main {\n  public static void main(String[] args) {\n    // Example: work with ${topic}\n    System.out.println("Practice: implement a small demo of ${topic}");\n  }\n}`;
    if (/python/i.test(subject)) return `# ${topic} — Python example\ndef demo():\n    print("Practice: build a small demo of ${topic}")\n\ndemo()`;
    if (/javascript|js/i.test(subject)) return `// ${topic} — JS example\nfunction demo() {\n  console.log("Practice: build a small demo of ${topic}");\n}\ndemo();`;
    return null;
  }

  // ---------- core generators (real, deterministic) ----------
  function tutorReply(question, { language = 'en', level = 'Beginner', simple = false } = {}) {
    const q = question.trim();
    const hit = kbFind(q);
    const cap = q.length > 90 ? q.slice(0, 90) + '…' : q;
    let def, analogy, points, code, mistakes, follow;
    if (hit) {
      ({ definition: def, analogy, points, code, mistakes } = hit);
      follow = simple ? 'Can you tell me in one line what the base idea is?' : 'Want to try the practice question below and I will check your answer?';
    } else {
      def = `“${cap}” means: the core idea broken into its smallest understandable parts, built up with one clear example.`;
      analogy = 'Think of it like learning to cook: first the ingredients (definitions), then one full recipe (example), then you try it yourself (practice).';
      points = [`What “${cap}” exactly means (definition)`, 'Where it is used in real life / exams', 'The 2–3 sub-ideas you must remember', 'How it connects to what you already know'];
      code = null; mistakes = ['Memorizing without one example', 'Skipping practice and revision within 24 hours'];
      follow = 'Tell me which part feels confusing and I will explain just that part simpler.';
    }
    const lvl = simple ? langLine(language, 'Explained in the simplest possible words.', 'மிக எளிய சொற்களில் விளக்கப்பட்டுள்ளது.', 'Miga eliya vaarthaigal-la vilakkappattulladhu.') : langLine(language, `Adapted for ${esc(level)} level.`, `${esc(level)} நிலைக்கு ஏற்ப விளக்கப்பட்டுள்ளது.`, `${esc(level)} level-ku yetha maadhiri vilakkappattulladhu.`);
    return `${langIntro(language, q)}
<p class="muted">${lvl}</p>
<h4>1️⃣ Simple definition</h4><p>${esc(def)}</p>
<h4>2️⃣ Easy explanation</h4><p>${esc(analogy)}</p>
<h4>3️⃣ Real-world analogy</h4><p>${esc(analogy)}</p>
${code ? `<h4>4️⃣ Example / Code</h4><pre>${esc(code)}</pre>` : `<h4>4️⃣ Example</h4><p>Example: take one real use of “${esc(cap)}” from your textbook, write it in 3 lines, then change one value and observe what happens. That single experiment teaches more than 10 pages.</p>`}
<h4>⭐ Important points</h4><ul>${(points || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
<h4>⚠️ Common mistake</h4><p>${esc((mistakes || [])[0] || '')}</p>
<h4>📝 Quick practice</h4><p>${esc(hit ? hit.practice : 'Write 3 lines explaining “' + cap + '” to a 10-year-old. If you can, you truly understood it.')}</p>
<p><b>❓ Follow-up:</b> ${esc(follow)}</p>`;
  }

  function lesson(subject, topic, level, goal, language = 'en') {
    const hit = kbFind(subject + ' ' + topic) || kbFind(topic);
    const code = hit?.code || (isCodeSubject(subject) ? codeFor(subject, topic) : null);
    const pts = hit?.points || [`Core definition of ${topic}`, `Why ${topic} matters for: ${goal || 'your goal'}`, `Prerequisites (what to know first)`, `Typical exam / interview angles on ${topic}`];
    return `${langIntro(language, `${subject}: ${topic}`)}
<p class="muted">${esc(subject)} • ${esc(topic)} • ${esc(level)} • Goal: ${esc(goal || 'mastery')}</p>
<h4>📖 Overview</h4><p>${esc(hit?.definition || `${topic} is a key concept in ${subject}. Master it in 3 layers: what it is, how it works, and how to apply it under exam pressure.`)} ${langLine(language, '', ' இதை படிப்படியாக கற்றுக்கொள்ளுங்கள்.', ' Idhai padippadiyaaga kathukollungal.')}</p>
<h4>💡 Simple explanation</h4><p>${esc(hit?.analogy || `Start with one concrete example of ${topic}, then generalize. ${level} learners should spend 70% time on examples, 30% on theory.`)}</p>
<h4>🧩 Key concepts</h4><ul>${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
${code ? `<h4>💻 Code / Worked example</h4><pre>${esc(code)}</pre>` : `<h4>🌍 Real-world example</h4><p>${esc(topic)} appears in everyday problem-solving: identify one situation from ${subject} where ${topic} is the natural tool, then solve it on paper in under 5 minutes.</p>`}
<h4>⚠️ Common mistakes</h4><ul>${(hit?.mistakes || ['Rushing to advanced parts before basics', 'No spaced revision']).map(m => `<li>${esc(m)}</li>`).join('')}</ul>
<h4>⭐ Must-remember points</h4><ul>${pts.slice(0, 3).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
<h4>✏️ Practice questions</h4><ul><li>Define ${esc(topic)} in your own words (2 lines).</li><li>Give one example and one counterexample.</li><li>${esc(hit?.practice || `Solve one previous-year question on ${topic}.`)}</li></ul>
<h4>🎯 Mini quiz (try now)</h4><p>1) What is the single most important idea in ${esc(topic)}?<br>2) What mistake do beginners always make?<br>3) Where would you use it in ${esc(goal || 'real life')}?</p>`;
  }

  function notes(subject, topic, source, type) {
    const s = (source || '').trim();
    const depth = type === 'Short Notes' ? 3 : type === 'Exam Notes' ? 5 : 6;
    const fromSrc = s ? s.split(/\n+/).filter(Boolean).slice(0, depth) : [];
    const def = kbFind(topic)?.definition || `${topic} (${subject}): the essential ideas organized for ${type.toLowerCase()}.`;
    let body = `<h3>${esc(subject)} — ${esc(topic)} <span class="tag">${esc(type)}</span></h3><h4>📌 Definition</h4><p>${esc(def)}</p>`;
    body += `<h4>🧩 Key points</h4><ul>`;
    const base = kbFind(topic)?.points || [`Meaning of ${topic}`, `Use-cases in ${subject}`, 'Formulas / steps / syntax', 'Exam traps', 'One-line revision hook', 'Link to next topic'];
    base.slice(0, depth).forEach(p => body += `<li>${esc(p)}</li>`);
    fromSrc.forEach(line => body += `<li>From your material: ${esc(line.slice(0, 140))}</li>`);
    body += `</ul><h4>💡 Example</h4><p>${esc(kbFind(topic)?.analogy || `One worked example of ${topic} with input → process → output written in 4 steps.`)}${s ? '' : ''}</p>`;
    if (type !== 'Short Notes') {
      const code = kbFind(topic)?.code;
      if (code) body += `<h4>💻 Reference</h4><pre>${esc(code)}</pre>`;
      body += `<h4>⭐ Exam focus</h4><ul><li>Most asked: definition + one example + one difference question.</li><li>Write answers in points; underline keywords.</li><li>Revise within 24h, 7 days, 30 days.</li></ul>`;
    }
    body += `<h4>📝 1-minute revision</h4><p>${esc(topic)} = ${(kbFind(topic)?.points || ['definition', 'example', 'use'])[0]}. Recall the example first, then the definition.</p>`;
    return body;
  }

  function quiz(subject, topic, difficulty, n) {
    const hit = kbFind(topic) || kbFind(subject + ' ' + topic);
    const bank = [];
    if (hit) {
      if (/array/i.test(topic)) {
        bank.push(
          { q: 'What is the index of the first element in a Java array?', opts: ['1', '0', '-1', 'Depends on size'], a: 1, why: 'Java arrays are 0-indexed: valid indexes are 0 … length-1.' },
          { q: 'How do you get the length of array arr in Java?', opts: ['arr.length()', 'arr.length', 'arr.size()', 'length(arr)'], a: 1, why: 'Arrays expose a field arr.length; length() is for Strings.' },
          { q: 'What happens on accessing arr[arr.length]?', opts: ['Returns null', 'Returns 0', 'ArrayIndexOutOfBoundsException', 'Compiles to last element'], a: 2, why: 'Max valid index is length-1, so index == length throws.' },
          { q: 'Array vs ArrayList?', opts: ['Both resizable', 'Array is fixed-size, ArrayList is resizable', 'ArrayList is fixed-size', 'No difference'], a: 1, why: 'Arrays are fixed; ArrayList grows dynamically.' },
          { q: 'Default value of int array elements?', opts: ['null', '1', '0', 'undefined'], a: 2, why: 'Numeric primitives default to 0; object arrays default to null.' },
          { q: 'Find largest element approach?', opts: ['Sort always', 'Single pass tracking max', 'Binary search', 'Random pick'], a: 1, why: 'One linear pass tracking max is O(n) and simplest.' }
        );
      } else {
        bank.push(
          { q: `What is the base case in recursion?`, opts: ['The recursive call', 'The stopping condition', 'The loop variable', 'The return type'], a: 1, why: 'Base case stops recursion; without it you get infinite calls.' },
          { q: 'What happens without a base case?', opts: ['Faster code', 'StackOverflowError', 'Compilation error', 'Nothing'], a: 1, why: 'Calls pile on the call stack until it overflows.' },
          { q: 'Which problem suits recursion best?', opts: ['Simple counter loop', 'Tree traversal', 'Printing hello', 'Adding two numbers'], a: 1, why: 'Self-similar structures (trees, divide & conquer) fit recursion.' }
        );
      }
    }
    // generic templated questions to reach n
    const generic = [
      { q: `Which statement best defines "${topic}"?`, opts: [`The core idea of ${topic} with one example`, `Something unrelated to ${subject}`, `Only a formula with no meaning`, `A topic you can skip`], a: 0, why: `A definition must include meaning + example of ${topic}.` },
      { q: `Where is "${topic}" most commonly applied in ${subject}?`, opts: ['In foundational problems and exams', 'Nowhere', 'Only in history', 'Only outside syllabus'], a: 0, why: `${topic} is foundational in ${subject}, so exams test it directly.` },
      { q: `What is the most common beginner mistake with "${topic}"?`, opts: ['Skipping basics and examples', 'Practising too much', 'Revising on schedule', 'Asking doubts'], a: 0, why: 'Beginners memorize theory without one worked example.' },
      { q: `Best way to revise "${topic}"?`, opts: ['Active recall + spaced repetition', 'Reading once passively', 'Highlighting only', 'Avoiding practice'], a: 0, why: 'Retrieval practice beats re-reading for retention.' },
      { q: `Which difficulty strategy fits a "${difficulty}" question on "${topic}"?`, opts: ['Recall → apply → explain to someone', 'Guess and move on', 'Memorize answers only', 'Skip revision'], a: 0, why: 'Explain-in-your-words proves real understanding at any level.' }
    ];
    let pool = [...bank, ...generic];
    // difficulty tweak: shuffle options deterministically per difficulty
    const count = Math.max(1, Math.min(20, n || 5));
    const out = [];
    for (let i = 0; i < count; i++) {
      const base = pool[i % pool.length];
      const rot = difficulty === 'Hard' ? (i % 4) : difficulty === 'Medium' ? ((i + 1) % 4) : 0;
      const opts = base.opts.map((_, k) => base.opts[(k + rot) % 4]);
      const a = (base.a - rot + 8) % 4;
      out.push({ q: base.q, opts, a, why: base.why, topic });
    }
    return out;
  }

  function flashcards(topic, source) {
    const hit = kbFind(topic);
    const cards = [];
    if (hit) {
      cards.push({ f: `What is ${topic}?`, b: hit.definition });
      cards.push({ f: `Give an analogy for ${topic}`, b: hit.analogy });
      cards.push({ f: `List 3 key points of ${topic}`, b: hit.points.slice(0, 3).join(' • ') });
      cards.push({ f: `Common mistake in ${topic}?`, b: hit.mistakes[0] });
      cards.push({ f: `Practice: ${topic}`, b: hit.practice });
    }
    const lines = (source || '').split(/\n+/).map(s => s.trim()).filter(s => s.length > 12).slice(0, 8);
    lines.forEach((ln, i) => cards.push({ f: `Recall point ${i + 1} from your material`, b: ln.slice(0, 220) }));
    if (!cards.length) {
      cards.push({ f: `Define: ${topic}`, b: `Core idea of ${topic} in 2 lines + one example.` });
      cards.push({ f: `Example of ${topic}?`, b: `One concrete worked example with input → output.` });
      cards.push({ f: `Where is ${topic} used?`, b: `One exam use + one real-life use.` });
      cards.push({ f: `Common mistake: ${topic}?`, b: `Skipping examples and spaced revision.` });
    }
    return cards.slice(0, 20);
  }

  function studyPlan({ subjects, topics, examDate, hours, level, priorities }) {
    const days = (() => {
      if (!examDate) return 7;
      const d = Math.round((new Date(examDate) - Date.now()) / 86400000);
      return Math.max(1, Math.min(60, isNaN(d) ? 7 : d));
    })();
    const tlist = (topics || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const slist = (subjects || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const items = tlist.length ? tlist : ['Foundations', 'Core concepts', 'Practice set', 'Mock revision'];
    const plan = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
      const t = items[d % items.length];
      const s = slist.length ? slist[d % slist.length] : (subjects || 'General');
      const prio = priorities && d < 2 ? 'High priority' : 'Normal';
      plan.push({ id: Store.uid(), date, subject: s, topic: t, duration: `${hours || 2}h`, task: `Learn ${t} (${level || 'Beginner'})`, revision: `Revise day-${Math.max(1, d)} notes (15 min)`, practice: `5 practice Qs on ${t}`, done: false, priority: prio });
    }
    return plan;
  }

  function weakness() {
    const results = Store.get('quizResults', []);
    if (!results.length) return null;
    const byTopic = {};
    results.forEach(r => (r.details || []).forEach(d => {
      byTopic[d.topic] = byTopic[d.topic] || { total: 0, wrong: 0, qs: [] };
      byTopic[d.topic].total++; if (!d.ok) { byTopic[d.topic].wrong++; byTopic[d.topic].qs.push(d.q); }
    }));
    const rows = Object.entries(byTopic).map(([t, v]) => ({ topic: t, acc: Math.round((v.total - v.wrong) / v.total * 100), ...v }))
      .sort((a, b) => a.acc - b.acc);
    const weak = rows.filter(r => r.acc < 70), strong = rows.filter(r => r.acc >= 70);
    return { rows, weak, strong };
  }

  // ---------- backend attempt ----------
  async function viaBackend(prompt, mode) {
    const s = settings();
    if (!s.apiEndpoint) throw new Error('no-backend');
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch(s.apiEndpoint, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: 'You are an intelligent personal learning assistant. Explain clearly with examples, adapt to level, encourage practice.' }, { role: 'user', content: prompt }], mode })
      });
      clearTimeout(to);
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      if (!data.reply) throw new Error('Bad API response');
      return String(data.reply);
    } catch (e) { clearTimeout(to); throw e; }
  }

  return {
    esc,
    async ask(q, opts) {
      try { return await viaBackend(q, 'tutor'); }
      catch (e) { if (e.message !== 'no-backend') throw e; return tutorReply(q, opts); }
    },
    tutorReply, lesson, notes, quiz, flashcards, studyPlan, weakness, kbFind,
    backendConfigured() { return !!settings().apiEndpoint; }
  };
})();
