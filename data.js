import { firebaseConfig, FIREBASE_VERSION } from './firebase-config.js';

export const isConfigured = () => Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

async function fromJson() {
  const res = await fetch('./videos.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('videos.json not found');
  const list = await res.json();
  return list.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Loads videos from Firestore when Firebase is set up, otherwise from videos.json.
// If Firebase can't be reached, we fall back to videos.json so the page is never empty.
export async function loadVideos() {
  if (isConfigured()) {
    try {
      const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
      const [{ initializeApp }, { getFirestore, collection, getDocs }] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-firestore.js`),
      ]);
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const snap = await getDocs(collection(db, 'videos'));
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    } catch (err) {
      console.warn('Firebase unavailable, using videos.json', err);
    }
  }
  return fromJson();
}
