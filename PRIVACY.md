# Privacy Policy — Neuron Note

_Last updated: 2026-07-31_

Neuron Note (the "Chrome/Edge extension" and the "Android app", together the "Software")
is designed to be **privacy-first**. This policy explains, in plain language, what data the
Software handles and where it goes.

## Short version

- **We run no server.** The developer of Neuron Note never receives, stores, or sees any of
  your data.
- Your notes live **on your own device**, and — only if you choose to enable sync — in a
  file on **your own Google Drive**, through a Google Apps Script that **you** create and
  control.
- We do **not** collect analytics, do **not** track you, and do **not** sell or share any
  data with anyone.

## What data the Software handles

The Software stores the content **you** choose to save, which may include:

- The text passages you highlight and save.
- Your own notes attached to those passages.
- Labels/tags, colors, and study progress (review dates, levels).
- For passages saved on the web: the source page URL, page title, and a small amount of
  surrounding text (~60 characters before and after) used to re-locate the highlight.

This data is created only by your explicit action (selecting text and saving it).

## Where your data is stored

- **Locally**, in the browser's `chrome.storage.local` (extension) or Capacitor
  **Preferences** (Android app). This stays on your device.
- **Optionally, in your Google Drive**: if you turn on sync, the Software reads and writes a
  single file named `neuron-note-data.json` on your own Google Drive, via a Google Apps
  Script Web App that **you deploy under your own Google account**. The developer has no
  access to this file or to your Google account.

There is **no third-party backend**. Data does not pass through any server operated by the
developer.

## Browser permissions (extension) and why they're needed

- **`<all_urls>` / host access** — so you can highlight and re-display saved passages on any
  web page you visit. The Software only reads page content when you actively save a
  selection or when it re-highlights your previously saved passages on that page.
- **`contextMenus`** — to add the "Save to Neuron Note" right-click menu.
- **`storage`** — to store your notes locally.
- **`scripting` / `activeTab`** — to highlight text on the current page.
- **`alarms`** — to schedule periodic auto-sync.

The Software does not read passwords, form inputs, or page content beyond what is needed to
save and re-display the passages you choose.

## Android app permissions

- **Internet** — only to sync with your own Google Drive (the URL you configure).
- **Text selection / share intents** — so you can send selected text from other apps into
  Neuron Note. Text is only captured when you explicitly choose Neuron Note from the menu.

## Third parties

The only external service involved is **Google Drive / Google Apps Script**, and only when
**you** enable sync using **your own** Google account. Your use of Google services is
governed by [Google's Privacy Policy](https://policies.google.com/privacy).

## Data retention and deletion

- You can delete any note at any time from within the Software.
- Deletions propagate through sync as "tombstones" and are automatically cleaned up after
  90 days.
- To remove all data: delete your notes, and/or remove the extension/app, and/or delete the
  `neuron-note-data.json` file from your Google Drive.

## Children

The Software is a general-purpose productivity tool and is not directed at children.

## Changes to this policy

If this policy changes, the "Last updated" date above will change, and the new version will
be published in this repository.

## Contact

Questions about privacy? Open an issue at
<https://github.com/heynyren/NeuronNote/issues>.
