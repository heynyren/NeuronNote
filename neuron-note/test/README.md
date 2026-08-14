# Extension tests

Plain Node + jsdom, no build step. From `neuron-note/`:

```
npm install jsdom fake-indexeddb --no-save
node test/run.js
```

| File | Covers |
| --- | --- |
| `math.js` | Unicode → LaTeX, PDF copy artifacts, `autoMath` leaving Vietnamese/Japanese prose alone |
| `raw-latex.js` | Raw LaTeX in text (`$\ge 8mm^2$`), `\(…\)` / `\[…\]` / environments, repair being idempotent |
| `capture.js` | Reading TeX out of KaTeX, MathJax v2/v3 and Wikipedia markup |
| `render.js` | KaTeX rendering in cards and study mode; prose stays escaped |
| `attach.js` | IndexedDB store, size limit, orphan sweep, and attachments never entering the sync payload |
