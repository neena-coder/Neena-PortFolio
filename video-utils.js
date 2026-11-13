// Shared helpers used by the site and the admin page.

const RATIOS = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
};

export function ratioValue(ratio) {
  return RATIOS[ratio] || RATIOS['16:9'];
}

export const RATIO_OPTIONS = Object.keys(RATIOS);

// Turns a pasted link into something we can embed.
// Supports YouTube, Vimeo and direct video files (.mp4, .webm, .mov ...).
// Returns null when the link isn't recognised.
export function parseVideoUrl(raw) {
  const url = String(raw || '').trim();
  if (!url) return null;

  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;

  const host = u.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube
  let ytId = null;
  if (host === 'youtu.be') {
    ytId = u.pathname.slice(1).split('/')[0];
  } else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
    if (u.pathname === '/watch') {
      ytId = u.searchParams.get('v');
    } else {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,15})/);
      if (m) ytId = m[1];
    }
  }
  if (ytId !== null) {
    if (!/^[\w-]{6,15}$/.test(ytId)) return null;
    return {
      type: 'iframe',
      provider: 'YouTube',
      src: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`,
    };
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([0-9a-f]+))?/i);
    if (!m) return null;
    const hash = u.searchParams.get('h') || m[2];
    return {
      type: 'iframe',
      provider: 'Vimeo',
      src: `https://player.vimeo.com/video/${m[1]}?${hash ? `h=${hash}&` : ''}title=0&byline=0&portrait=0&badge=0&dnt=1`,
    };
  }

  // Direct video file
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(u.pathname)) {
    return { type: 'video', provider: 'Video file', src: url };
  }

  return null;
}
