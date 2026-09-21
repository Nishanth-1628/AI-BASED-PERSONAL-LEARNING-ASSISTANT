/* Central LocalStorage layer */
const Store = (() => {
  const P = 'ala_';
  const read = (k, fb) => {
    try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : fb; }
    catch { return fb; }
  };
  const write = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { console.warn('storage full', e); } };
  return {
    get(k, fb) { return read(k, fb); },
    set(k, v) { write(k, v); return v; },
    push(k, item, max = 500) {
      const a = read(k, []); a.unshift(item); while (a.length > max) a.pop(); write(k, a); return a;
    },
    removeAt(k, id) {
      const a = read(k, []).filter(x => (x.id || x.t) !== id); write(k, a); return a;
    },
    clearAll() { Object.keys(localStorage).filter(k => k.startsWith(P)).forEach(k => localStorage.removeItem(k)); },
    uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    today() { return new Date().toISOString().slice(0, 10); }
  };
})();

/* Progress helpers */
const Progress = {
  bumpStudyMinutes(min = 5) {
    const s = Store.get('stats', { minutes: 0, topics: [], quizzes: 0, tasksDone: 0, streak: {}, totalScore: 0, scoreCount: 0 });
    s.minutes = (s.minutes || 0) + min;
    const t = Store.today(); s.streak = s.streak || {}; s.streak[t] = true;
    Store.set('stats', s); return s;
  },
  addTopic(topic) {
    const s = Store.get('stats', { minutes: 0, topics: [], quizzes: 0, tasksDone: 0, streak: {}, totalScore: 0, scoreCount: 0 });
    s.topics = s.topics || [];
    if (topic && !s.topics.includes(topic)) s.topics.push(topic);
    Store.set('stats', s);
  },
  addQuiz(pct) {
    const s = Store.get('stats', { minutes: 0, topics: [], quizzes: 0, tasksDone: 0, streak: {}, totalScore: 0, scoreCount: 0 });
    s.quizzes = (s.quizzes || 0) + 1; s.totalScore = (s.totalScore || 0) + pct; s.scoreCount = (s.scoreCount || 0) + 1;
    Store.set('stats', s);
  },
  streakDays() {
    const st = Store.get('stats', {}).streak || {}; return Object.keys(st).length;
  },
  completion() {
    const tasks = Store.get('tasks', []);
    if (!tasks.length) return 0;
    return Math.round(tasks.filter(t => t.done).length / tasks.length * 100);
  }
};
