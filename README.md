# セーブファイル言語変換

Static HTML/CSS/JS tool to convert Danganronpa save language settings in `.vfs` files. All processing runs in the browser (no server).

## Usage

Open `index.html` from a local web server (ES modules require HTTP and correct MIME types):

```bash
npm start
```

> **Note:** Do not use `python -m http.server` on Windows — it serves `.js` files as `text/plain`, which the browser rejects for ES modules.

Then visit the served URL and upload a `.vfs` file.

## Tests

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm test
```

Tests read binary fixtures from `fixtures/`.

## Files

| File        | Role                                      |
|------------|-------------------------------------------|
| `index.html` | Page shell                              |
| `style.css`  | Styles                                  |
| `script.js`  | UI; imports `vfs.js`                    |
| `vfs.js`     | VFS parse/rebuild and save editing      |
| `vfs.test.js`| Node tests for `vfs.js`                 |
