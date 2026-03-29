# セーブファイル言語変換

Static HTML/CSS/JS tool to convert Danganronpa save language settings in `.vfs` files. All processing runs in the browser (no server).

## Usage

Open `index.html` from a local web server (ES modules require HTTP; `file://` may block module loading):

```bash
npx --yes serve .
# or: python -m http.server 8080
```

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
