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
| `youtube.js` | Timestamp capture from transcript rows vs the playhead, `yt` surviving into the note, and returning to a moment by reusing an open tab |
| `context.js` | The wide context window: paragraph capture, widening thin blocks, word-boundary cuts |
| `gemini.js` | Prompt building — broad-knowledge questions, formula variant, no-context honesty |
| `gemini-ui.js` | The button in the library and study mode; the saved chat link |
| `gemini-yt.js` | The transcript-line button, neighbouring-line context, and yt passing through capCua |
