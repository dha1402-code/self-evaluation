// يجمع الواجهة في ملف HTML واحد يعمل دون إنترنت في أي متصفح (ويندوز/ماك)
import fs from 'node:fs';
const r = f => fs.readFileSync(new URL('../renderer/' + f, import.meta.url), 'utf8');
const html = r('index.html')
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/, '')
  .replace('<link rel="stylesheet" href="styles.css">', () => '<style>\n' + r('styles.css') + '\n</style>')
  .replace('<script src="data.js"></script>', () => '<script>\n' + r('data.js') + '\n</script>')
  .replace('<script src="app.js"></script>', () => '<script>\n' + r('app.js') + '\n</script>');
const out = process.argv[2] || 'التقويم-الذاتي-دون-انترنت.html';
fs.writeFileSync(out, html);
console.log('تم إنشاء', out, Math.round(html.length / 1024) + ' KB');
