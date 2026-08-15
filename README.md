<div align="center">

**🌐 English · [Tiếng Việt](README.vi.md)**

# 🧠 Neuron Note

**Highlight the web. Remember what matters.**

Select any passage on a page → save it under a label, with a link that jumps you
straight back to the exact spot → review it right before you'd forget, with
**spaced repetition**. Syncs between desktop and phone through your own Google Drive.

![Version](https://img.shields.io/badge/extension-v1.6.1-6c5ce7)
![Android](https://img.shields.io/badge/android-v1.1.1-2ecc71)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Android-lightgrey)

</div>

---

## What is Neuron Note?

We read great things on the web and forget almost all of them. Neuron Note turns
"highlighting to remember" into a real learning loop:

1. **Save in one move** — select text → right-click → pick a label → done. The passage
   is highlighted right on the page, with a *text-fragment link* that takes you back to
   the exact spot.
2. **Review at the right time** — every passage enters a review schedule automatically.
   Remembered? The interval grows `1 → 3 → 7 → 14 → 30 → 60 → 120` days. Forgot? You see
   it again after 1 day.
3. **Everywhere** — the same data on **Chrome/Edge** and **Android**, synced both ways
   through Google Drive (your *own* Apps Script backend — no third-party server).

## What's in this repo

| Folder | Contents |
|---|---|
| [`neuron-note/`](neuron-note/) | **Chrome/Edge extension** (Manifest V3) — the main app. See its [README](neuron-note/README.md). |
| [`android-app/`](android-app/) | **Android app** (Capacitor) — companion, shares the same backend. See its [README](android-app/README.md). |

## Highlights

- 🏷️ **Google-Keep-style labels** — one passage can carry many labels; filter by AND/OR.
- 🔁 **Study mode** — spaced repetition, keyboard shortcuts, snooze / mark-as-mastered.
- 📈 **Progress & rewards** — a daily goal, a streak of days in a row, a 17-week heat
  calendar and 23 badges, the same idea as the Denken 3 Shuu study app. Progress syncs
  between desktop and phone alongside your passages.
- 🔗 **Precise re-anchoring** — uses the browser's native *text fragment* standard, so a
  link jumps to the right place even for people who don't have the extension.
- ∑ **Understands math** — recognizes KaTeX/MathJax formulas (e.g. content from Gemini).
- ☁️ **Google Drive sync** — merges with "newest wins", deletions propagate via tombstones.
- 📧 **Morning review email** — via Apps Script.
- 📤 **Export / import** — Markdown, JSON, CSV.

## Quick start

**Extension (Chrome/Edge):**
```
1. Go to chrome://extensions → enable Developer mode
2. Load unpacked → select the neuron-note/ folder
```
Full setup, including sync: [neuron-note/README.md](neuron-note/README.md).

**Android app:** needs Node.js + Android Studio — see the
[build guide](android-app/README.md).

## Privacy & data

Neuron Note has **no server of its own**. All your data lives in your browser/phone
(`chrome.storage.local` / Capacitor Preferences) and — if you turn on sync — in a
`neuron-note-data.json` file on **your own Google Drive**, through an Apps Script *you*
create. Nobody else can reach it. See [PRIVACY.md](PRIVACY.md).

## Support the project 💝

Neuron Note is free and open source. If it helps you remember more of what you read,
consider supporting development — see the **Sponsor** button at the top of the repo.

## Author

Created and maintained by **Nyren Pham** — https://github.com/heynyren/NeuronNote

This is my original work. If it helps you, a ⭐ on the repo is appreciated.

## Name & logo (trademark)

The **code** is open under AGPL-3.0, but the name **"Neuron Note"** and its
**logo/icons** are marks of the author and are *not* part of the code license.
You're welcome to use and fork the code — please give your fork its **own name
and branding** rather than presenting it as the official "Neuron Note". See
[NOTICE](NOTICE).

## License

Released under the **[GNU Affero General Public License v3.0](LICENSE)** (AGPL-3.0).

In short: you may use, study, share, and modify this software freely — but if you
distribute it, **or run a modified version as a network service**, you must
**release your source code under the same license** and **credit the original
author**. This keeps Neuron Note open for everyone and prevents it from being
taken closed-source. See [NOTICE](NOTICE) for authorship and trademark details.
