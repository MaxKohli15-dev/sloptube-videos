// Erstellt index.json aus der Ordnerstruktur DATUM/KANAL/VIDEO.ext
// Läuft automatisch per GitHub Action bei jedem Upload.
const fs = require('fs');
const path = require('path');

const VEXT = /\.(mp4|webm|mov|m4v|ogg)$/i;
const IMG = ['.jpg', '.jpeg', '.png', '.webp'];
const exists = p => fs.existsSync(p);
const findImg = base => IMG.map(e => base + e).find(exists) || null;
const readText = p => (exists(p) ? fs.readFileSync(p, 'utf8') : '');

const videos = [];
const channels = {};
const ch = name => (channels[name] ||= { name, avatar: null, banner: null, about: '', links: [], joined: null, videos: 0 });

for (const date of fs.readdirSync('.').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()) {
  for (const channel of fs.readdirSync(date)) {
    const dir = path.join(date, channel);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter(f => VEXT.test(f))) {
      const base = path.join(dir, file.replace(VEXT, ''));
      const st = fs.statSync(path.join(dir, file));
      const c = ch(channel);
      c.videos++;
      c.joined ||= date;
      videos.push({
        path: `${date}/${channel}/${file}`,
        date, channel,
        title: file.replace(VEXT, ''),
        thumb: (findImg(base) || '').replace(/\\/g, '/') || null,
        desc: readText(base + '.txt').slice(0, 5000),
        size: st.size,
        added: st.mtimeMs,
      });
    }
  }
}

// Kanal-Infos: _kanaele/NAME/avatar.jpg, banner.jpg, info.json {"about": "...", "links": [...]}
if (exists('_kanaele')) {
  for (const name of fs.readdirSync('_kanaele')) {
    const dir = path.join('_kanaele', name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const c = ch(name);
    c.avatar = (findImg(path.join(dir, 'avatar')) || '').replace(/\\/g, '/') || null;
    c.banner = (findImg(path.join(dir, 'banner')) || '').replace(/\\/g, '/') || null;
    try { Object.assign(c, JSON.parse(readText(path.join(dir, 'info.json')) || '{}'), { name }); } catch {}
    c.joined ||= c.created || null;
  }
}

videos.sort((a, b) => b.date.localeCompare(a.date) || b.added - a.added);
fs.writeFileSync('index.json', JSON.stringify({ updated: Date.now(), videos, channels }, null, 1));
console.log(`${videos.length} Videos, ${Object.keys(channels).length} Kanäle`);
