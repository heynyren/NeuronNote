**🌐 English · [Tiếng Việt](README.vi.md)**

# Neuron Note v1.3.0

Select any passage on a web page → right-click, choose a **label** → it's saved
instantly, together with a **link back to the exact spot**. Review it with
**spaced repetition**, filter by multiple labels, and get a **morning review email**.
Syncs through Google Drive (the same backend the Android app uses).

## Filtering by multiple labels

Click several labels in the left column to select them at once. A small bar appears
letting you choose: **any** (has at least one of the labels — OR) or **all** (must have
every selected label — AND). Click ✕ to clear the filter.

## Study mode (spaced repetition)

Click **Study** at the top of the library (the amber number is how many passages are
due). Each passage appears; you read it, click **Show note** to check, then rate yourself
**Got it** / **Not yet**:
- **Got it** → level up, the interval stretches `1 → 3 → 7 → 14 → 30 → 60 → 120` days.
- **Not yet** → back to review after 1 day.

Study shortcuts: `Space` flips, `1`/`←` = Not yet, `2`/`→`/`Enter` = Got it.

Every passage joins the study schedule when saved. You stay **fully in control**:
- **Snooze from study** — temporarily drop a passage from the schedule (button on the
  card, or during study).
- **Mastered** — permanently remove a passage you clearly know from reviews (mark it while
  editing or during study).
- Both can be re-enabled anytime with **Back to study** / **Study again**.

If you're filtering by label, Study reviews exactly that filtered set; with no filter, it
reviews everything.

## Morning review email (via Apps Script)

A Chrome extension can't send email on its own, but your Apps Script can. Once you've set
up sync (below), reopen your Apps Script project:
1. Paste the new `Code.gs` (which includes the email part).
2. Run the `installDailyTrigger` function **once** by hand (pick the function in the
   toolbar → Run), and grant the mail-sending permission when asked. From then on, around
   7am each morning you'll get an email listing how many passages are due plus a few
   specific ones. To change the time: edit `DIGEST_HOUR` and run that function again.
3. To test right away: run the `testDigestNow` function.

Requirement: the extension must be **synced** so your study data is on Drive for Apps
Script to read.

**Nice detail:** Neuron Note also recognizes **math formulas** rendered by KaTeX/MathJax
(e.g. content Gemini outputs). It ignores the hidden MathML and the raw TeX source,
capturing only the formula as shown on screen, so it saves and re-highlights accurately.

## Google-Keep-style labels

In the **Library**, click **Edit** on a passage: the *Labels* section shows your labels as
**click-to-toggle chips**. Click to turn them on/off — **one passage can carry several
labels at once**, no more typing. Click **＋ label** to create a new label right there
(type a name, Enter); the new label is added to the shared list. The same works for the
inline edit card on the page.

---

## Google-Keep-style workflow

1. **Create labels first.** Open the **Library** (click the icon → Library) → left column,
   *My labels* → click **＋** to create a label (name + color). E.g. `japanese`,
   `read-later`, `ideas`.
2. **Saving files it immediately.** Select the passage → **right-click** → *Save to Neuron
   Note* → a submenu shows your labels → click one and it's **saved straight into that
   label**, no popup window. The passage is highlighted in the label's color, and a small
   toast *"Saved · #label"* shows for ~5 seconds (with *Undo* and *Note* if needed).
3. **Add a "why it matters" note later.** Open the Library, click **Edit** on that passage
   to add a note, or click the highlighted passage directly on the page.

Set a label as the **default** (click ★ next to a label in the Library, or choose it in
the popup): then the `Alt`+`Shift`+`N` shortcut and the *Save* button in the popup save
straight into the default label.

> A label is really a *tag* on the passage. A passage can carry many tags; predefined
> labels are just a list for quick assignment. Removing a label from the list does **not**
> delete passages carrying it — they stay, the label just leaves the quick-assign list.

---

## 1. Install the extension

1. Unzip the `neuron-note/` folder.
2. Open `chrome://extensions` (or `edge://extensions`) → enable **Developer mode**.
3. **Load unpacked** → select the `neuron-note/` folder.

> **When upgrading later:** unzip over the **same old folder** and click the ⟳ button in
> `chrome://extensions`. If you load a new folder, the extension gets a new ID and **loses
> all saved notes**.

## 2. Daily use

| Task | How |
|---|---|
| Create a label | Library → *My labels* → **＋** (name + color) |
| Save into a label | Select → right-click → *Save to Neuron Note* → click a label |
| Save with shortcut | Select → `Alt` + `Shift` + `N` (into the default label) |
| Set the default label | Click ★ next to a label in the Library, or choose in the popup |
| Note later | Click **Edit** in the Library, or click the highlighted passage on the page |
| Review on the page | Saved passages are highlighted in the label color; click to open/edit |
| Jump back to a passage | Library → **Open passage**, or **Copy link** and paste it anywhere |
| Library | Click the icon → **Library** |

The copied link looks like:

```
https://source-site.com/article#nn=nn_abc123:~:text=The%20memory-,researchers%20say,-that
```

The `:~:text=` part is the browser's standard *text fragment* — someone without the
extension still lands at the right spot. The `#nn=<id>` part is how Neuron Note knows which
passage to flash.

### How re-anchoring works

On save, the extension records the passage text plus ~60 characters before and after. When
you reopen the page, it indexes the page's full text, normalizes whitespace, then finds the
passage. If the page has several identical spots, the before/after context is scored to
pick the original one. A passage spanning multiple tags (`<em>`, `<a>`, `<span>`…) is still
highlighted seamlessly. On pages that load content dynamically, the extension retries up to
6 times over ~5 seconds.

## 3. Turn on sync (Google Drive via Apps Script)

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Paste all of `appscript/Code.gs`. **No password is needed by default** (`SECRET = ''`)
   — leave it as is and sync just works, with the *Secret* box in the extension left empty.
   Only if you want to lock it, set `var SECRET = 'your-string'` and enter that same string
   in the extension.
3. **`Ctrl+S` to save first**, then **Deploy → New deployment → Web app**:
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
4. Copy the link ending in `/exec`.
5. In the extension: **Settings** → paste the link into *Web App URL*, enter the matching
   *Secret*, enable *Auto-sync* → **Save settings** → click **Sync**.

**Two common errors:**
- `Script function not found: doGet` → you deployed before saving. Save the code, then
  **Deploy → New deployment** (or *Manage deployments* → edit the version) again.
- `<!DOCTYPE` parse error → access isn't set to **Anyone**.

Your data lives in a `neuron-note-data.json` file on your Drive. Merge rule: the entry with
a newer `updatedAt` wins; deletions travel as "tombstones" (`deleted: true`) and are cleaned
up after 90 days.

## 4. Data format (so the Android app can reuse it)

```jsonc
{
  "id":        "nn_lz9k2_a7f3x",
  "text":      "the highlighted passage",
  "note":      "your note",
  "tags":      ["read-later", "ideas"],
  "color":     "amber",              // amber | mint | sky | rose | lilac
  "url":       "https://…",          // hash and utm_* stripped
  "fragUrl":   "https://…#nn=…:~:text=…",
  "title":     "page title",
  "prefix":    "60 chars before",
  "suffix":    "60 chars after",
  "createdAt": 1730000000000,
  "updatedAt": 1730000000000,
  "deleted":   false
}
```

All notes live in a single `{ id: note }` object. The Android app only needs to:
`POST` to the `/exec` link with `Content-Type: text/plain;charset=utf-8` and body
`{"action":"sync","key":"<SECRET>","notes":{…}}` → it gets back `{"ok":true,"notes":{…}}`
already merged. Uses `text/plain` to avoid Apps Script's CORS preflight.

## 5. Exporting data

In the library: **Export** (Markdown grouped by source), or Settings → **JSON backup** /
**Export CSV**. **Import** takes a JSON file back and merges it by the same newest-wins rule.

---

## File structure

```
neuron-note/
├── manifest.json
├── background.js      context menu, shortcut, saving notes, sync, badge
├── content.js         capture selection, anchor & re-highlight, floating note card
├── content.css        highlight styles on the source page
├── shared.js          URL normalization, text-fragment building, data merge, storage
├── notes.html/css/js  library: search, filter by label/source, edit, export/import, settings
├── popup.html/css/js  small panel: notes on this page + quick save + sync
├── icons/             icon16/32/48/128 + logo.svg
└── appscript/Code.gs  sync backend on Google Apps Script
```

Uses only `chrome.storage.local` — no server other than your own Apps Script.
