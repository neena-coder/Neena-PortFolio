import { firebaseConfig, FIREBASE_VERSION } from './firebase-config.js';
import { parseVideoUrl } from './video-utils.js';

const $ = id => document.getElementById(id);
const configured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const els = {
  notConfigured: $('notConfigured'), loginCard: $('loginCard'), dash: $('dash'), signOut: $('signOut'),
  loginForm: $('loginForm'), email: $('email'), password: $('password'), loginMsg: $('loginMsg'),
  form: $('videoForm'), formTitle: $('formTitle'), title: $('title'), tag: $('tag'), ratio: $('ratio'),
  url: $('url'), urlHint: $('urlHint'), description: $('description'), saveBtn: $('saveBtn'),
  cancelEdit: $('cancelEdit'), formMsg: $('formMsg'),
  list: $('list'), empty: $('empty'), countLabel: $('countLabel'), seedBtn: $('seedBtn'), listMsg: $('listMsg'),
};

function say(el, text, kind) {
  el.textContent = text || '';
  el.className = el.className.replace(/\b(ok|bad)\b/g, '').trim() + (kind ? ' ' + kind : '');
}

if (!configured) {
  els.notConfigured.hidden = false;
} else {
  start().catch(err => {
    console.error(err);
    els.notConfigured.hidden = false;
    els.notConfigured.querySelector('p').textContent =
      'Could not start Firebase. Check firebase-config.js and your internet connection.';
  });
}

async function start() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);
  const { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } = auth;
  const { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } = fs;

  const app = initializeApp(firebaseConfig);
  const authInst = getAuth(app);
  const db = getFirestore(app);
  const col = collection(db, 'videos');

  let videos = [];
  let editingId = null;

  /* ----- auth ----- */
  onAuthStateChanged(authInst, user => {
    els.loginCard.hidden = Boolean(user);
    els.dash.hidden = !user;
    els.signOut.hidden = !user;
    if (user) refresh();
  });

  els.loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    say(els.loginMsg, 'Signing in…');
    try {
      await signInWithEmailAndPassword(authInst, els.email.value.trim(), els.password.value);
      say(els.loginMsg, '');
      els.password.value = '';
    } catch (err) {
      say(els.loginMsg, 'Sign in failed. Check your email and password.', 'bad');
    }
  });
  els.signOut.addEventListener('click', () => signOut(authInst));

  /* ----- link check ----- */
  els.url.addEventListener('input', () => {
    const v = els.url.value.trim();
    if (!v) { els.urlHint.textContent = 'YouTube, Vimeo or a direct .mp4 / .webm link.'; els.urlHint.className = 'hint'; return; }
    const m = parseVideoUrl(v);
    if (m) { els.urlHint.textContent = 'Recognised: ' + m.provider; els.urlHint.className = 'hint ok'; }
    else { els.urlHint.textContent = "Can't read this link. Use a YouTube, Vimeo or direct .mp4 / .webm link."; els.urlHint.className = 'hint bad'; }
  });

  /* ----- load + render ----- */
  async function refresh() {
    try {
      const snap = await getDocs(col);
      videos = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      render();
    } catch (err) {
      console.error(err);
      say(els.listMsg, "Couldn't load videos. Make sure the Firestore rules in SETUP.md are published and you signed in with the admin email.", 'bad');
    }
  }

  function render() {
    els.list.innerHTML = '';
    els.empty.hidden = videos.length > 0;
    els.seedBtn.hidden = videos.length > 0;
    els.countLabel.textContent = videos.length ? `(${videos.length})` : '';

    videos.forEach((v, i) => {
      const li = document.createElement('li');
      li.className = 'item';

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = String(i + 1).padStart(2, '0');

      const info = document.createElement('div');
      const t = document.createElement('div');
      t.className = 't';
      t.textContent = v.title;
      const s = document.createElement('div');
      s.className = 's';
      s.textContent = [v.tag, v.url].filter(Boolean).join(' · ');
      info.append(t, s);

      const btns = document.createElement('div');
      btns.className = 'btns';
      const mk = (label, fn, cls, disabled) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.disabled = Boolean(disabled);
        b.addEventListener('click', fn);
        return b;
      };
      btns.append(
        mk('Up', () => move(i, -1), '', i === 0),
        mk('Down', () => move(i, 1), '', i === videos.length - 1),
        mk('Edit', () => startEdit(v)),
        mk('Delete', () => remove(v), 'danger'),
      );

      li.append(num, info, btns);
      els.list.appendChild(li);
    });
  }

  /* ----- add / edit ----- */
  function resetForm() {
    editingId = null;
    els.form.reset();
    els.formTitle.textContent = 'Add a video';
    els.saveBtn.textContent = 'Add video';
    els.cancelEdit.hidden = true;
    els.urlHint.textContent = 'YouTube, Vimeo or a direct .mp4 / .webm link.';
    els.urlHint.className = 'hint';
  }

  function startEdit(v) {
    editingId = v.id;
    els.title.value = v.title || '';
    els.tag.value = v.tag || '';
    els.ratio.value = v.ratio || '16:9';
    els.url.value = v.url || '';
    els.description.value = v.description || '';
    els.formTitle.textContent = 'Edit video';
    els.saveBtn.textContent = 'Save changes';
    els.cancelEdit.hidden = false;
    say(els.formMsg, '');
    els.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  els.cancelEdit.addEventListener('click', () => { resetForm(); say(els.formMsg, ''); });

  els.form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = els.url.value.trim();
    if (!parseVideoUrl(url)) {
      say(els.formMsg, "That link isn't a YouTube, Vimeo or direct video link.", 'bad');
      return;
    }
    const data = {
      title: els.title.value.trim(),
      tag: els.tag.value.trim(),
      ratio: els.ratio.value,
      url,
      description: els.description.value.trim(),
    };
    els.saveBtn.disabled = true;
    say(els.formMsg, 'Saving…');
    try {
      if (editingId) {
        await updateDoc(doc(db, 'videos', editingId), data);
        say(els.formMsg, 'Changes saved.', 'ok');
      } else {
        const order = videos.length ? Math.max(...videos.map(v => v.order ?? 0)) + 1 : 1;
        await addDoc(col, { ...data, order, createdAt: serverTimestamp() });
        say(els.formMsg, 'Video added. It will show at the end of your work.', 'ok');
      }
      resetForm();
      await refresh();
    } catch (err) {
      console.error(err);
      say(els.formMsg, "Couldn't save. Check you're signed in with the admin email and the Firestore rules are published.", 'bad');
    } finally {
      els.saveBtn.disabled = false;
    }
  });

  /* ----- reorder / delete ----- */
  async function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= videos.length) return;
    const a = videos[i], b = videos[j];
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'videos', a.id), { order: j + 1 });
      batch.update(doc(db, 'videos', b.id), { order: i + 1 });
      await batch.commit();
      say(els.listMsg, '');
      await refresh();
    } catch (err) {
      console.error(err);
      say(els.listMsg, "Couldn't reorder. Try again.", 'bad');
    }
  }

  async function remove(v) {
    if (!confirm(`Delete "${v.title}"? This can't be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'videos', v.id));
      if (editingId === v.id) resetForm();
      await refresh();
    } catch (err) {
      console.error(err);
      say(els.listMsg, "Couldn't delete. Try again.", 'bad');
    }
  }

  /* ----- starter set ----- */
  els.seedBtn.addEventListener('click', async () => {
    els.seedBtn.disabled = true;
    say(els.listMsg, 'Loading starter videos…');
    try {
      const res = await fetch('./videos.json', { cache: 'no-cache' });
      const list = await res.json();
      const batch = writeBatch(db);
      list.forEach(v => {
        const ref = doc(col);
        batch.set(ref, { ...v, createdAt: serverTimestamp() });
      });
      await batch.commit();
      say(els.listMsg, 'Starter videos loaded.', 'ok');
      await refresh();
    } catch (err) {
      console.error(err);
      say(els.listMsg, "Couldn't load the starter videos.", 'bad');
    } finally {
      els.seedBtn.disabled = false;
    }
  });
}
