/* Chạy toàn bộ test của extension: node test/run.js  (cần: npm i jsdom fake-indexeddb) */
const { execFileSync } = require('child_process');
const path = require('path');
const files = ['math.js', 'raw-latex.js', 'capture.js', 'render.js', 'attach.js'];
let bad = 0;
files.forEach(f => {
  process.stdout.write('\n=== ' + f + ' ===\n');
  try { execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' }); }
  catch (e) { bad++; }
});
console.log('\n' + (bad ? `✗ ${bad}/${files.length} tệp test HỎNG` : `✓ Cả ${files.length} tệp test đều qua`));
process.exit(bad ? 1 : 0);
