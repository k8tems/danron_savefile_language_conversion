import {
  parseVfs,
  rebuildVfs,
  isDataBin,
  getSavefileLangs,
  getEventId,
  editSavefile,
} from "./vfs.js";

const LANG_NAMES = { 0: "English", 1: "日本語", 2: "中文" };

document.addEventListener("DOMContentLoaded", () => {
  const $ = (sel) => document.querySelector(sel);

  const uploadForm = $("#upload-form");
  const fileInput = $("#file-input");
  const uploadStatus = $("#upload-status");
  const settingsSec = $("#settings-section");
  const downloadSec = $("#download-section");
  const convertBtn = $("#convert-btn");
  const restartBtn = $("#restart-btn");
  const convertStatus = $("#convert-status");
  const downloadLink = $("#download-link");
  const bulkVoice = $("#bulk-voice");
  const bulkText = $("#bulk-text");
  const bulkApplyBtn = $("#bulk-apply-btn");
  const subfilesTbody = $("#subfiles-tbody");

  /** @type {{ entries: { name: string, data: Uint8Array }[], filename: string } | null} */
  let vfsState = null;

  const LANG_OPTIONS =
    '<option value="0">English</option>' +
    '<option value="1">日本語</option>' +
    '<option value="2">中文</option>';

  function showStatus(el, text, cls) {
    el.textContent = text;
    el.className = "status-msg " + (cls || "");
    el.hidden = false;
  }

  function hideStatus(el) {
    el.hidden = true;
  }

  function resetAll() {
    uploadForm.reset();
    settingsSec.hidden = true;
    downloadSec.hidden = true;
    hideStatus(uploadStatus);
    hideStatus(convertStatus);
    vfsState = null;
    subfilesTbody.innerHTML = "";

    const href = downloadLink.getAttribute("href");
    if (href && href.startsWith("blob:")) {
      URL.revokeObjectURL(href);
    }
    downloadLink.removeAttribute("href");
    downloadLink.removeAttribute("download");
  }

  function toHex(n) {
    return "0x" + (n >>> 0).toString(16).toUpperCase();
  }

  function buildSubfileRows(files) {
    subfilesTbody.innerHTML = "";
    files.forEach((f) => {
      const hexId = toHex(f.event_id);
      const tr = document.createElement("tr");
      tr.dataset.name = f.name;
      tr.innerHTML =
        '<td class="label-cell">' +
        f.name +
        "</td>" +
        '<td><span class="current-val">' +
        f.voice_lang_name +
        "</span></td>" +
        '<td><select class="retro-select voice-sel">' +
        LANG_OPTIONS +
        "</select></td>" +
        '<td><span class="current-val">' +
        f.text_lang_name +
        "</span></td>" +
        '<td><select class="retro-select text-sel">' +
        LANG_OPTIONS +
        "</select></td>" +
        '<td><span class="current-val">' +
        hexId +
        "</span></td>" +
        '<td><input type="text" class="retro-input event-id-input" value="' +
        hexId +
        '"></td>';
      tr.querySelector(".voice-sel").value = String(f.voice_lang);
      tr.querySelector(".text-sel").value = String(f.text_lang);
      subfilesTbody.appendChild(tr);
    });
  }

  bulkApplyBtn.addEventListener("click", () => {
    const v = bulkVoice.value;
    const t = bulkText.value;
    subfilesTbody.querySelectorAll("tr").forEach((tr) => {
      if (v !== "") tr.querySelector(".voice-sel").value = v;
      if (t !== "") tr.querySelector(".text-sel").value = t;
    });
  });

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!fileInput.files.length) {
      showStatus(uploadStatus, "ファイルを選択してください。", "error");
      return;
    }

    showStatus(uploadStatus, "読み込み中…", "loading");
    settingsSec.hidden = true;
    downloadSec.hidden = true;

    const file = fileInput.files[0];

    try {
      const buf = await file.arrayBuffer();
      const entries = parseVfs(new Uint8Array(buf));

      /** @type {Array<{name: string, voice_lang: number, text_lang: number, voice_lang_name: string, text_lang_name: string, event_id: number}>} */
      const subfiles = [];
      for (const entry of entries) {
        if (!isDataBin(entry.name)) continue;
        const [text, voice] = getSavefileLangs(entry.data);
        const eventId = getEventId(entry.data);
        subfiles.push({
          name: entry.name,
          voice_lang: voice,
          text_lang: text,
          voice_lang_name: LANG_NAMES[voice] ?? `不明 (${voice})`,
          text_lang_name: LANG_NAMES[text] ?? `不明 (${text})`,
          event_id: eventId,
        });
      }

      if (!subfiles.length) {
        throw new Error("有効なセーブデータが見つかりませんでした。");
      }

      vfsState = { entries, filename: file.name || "savefile.vfs" };
      buildSubfileRows(subfiles);

      hideStatus(uploadStatus);
      settingsSec.hidden = false;
      downloadSec.hidden = true;
    } catch (err) {
      showStatus(
        uploadStatus,
        err instanceof Error ? err.message : String(err),
        "error"
      );
    }
  });

  convertBtn.addEventListener("click", async () => {
    if (!vfsState) return;

    convertBtn.disabled = true;
    showStatus(convertStatus, "変換中…", "loading");

    /** @type {Array<{name: string, voice_lang: number, text_lang: number, event_id: number | null}>} */
    const settings = [];
    subfilesTbody.querySelectorAll("tr").forEach((tr) => {
      const raw = tr
        .querySelector(".event-id-input")
        .value.trim()
        .replace(/^0[xX]/, "");
      const eid = parseInt(raw, 16);
      settings.push({
        name: tr.dataset.name,
        voice_lang: parseInt(tr.querySelector(".voice-sel").value, 10),
        text_lang: parseInt(tr.querySelector(".text-sel").value, 10),
        event_id: Number.isNaN(eid) ? null : eid,
      });
    });

    try {
      const settingsMap = Object.fromEntries(settings.map((s) => [s.name, s]));
      for (const entry of vfsState.entries) {
        const s = settingsMap[entry.name];
        if (s) {
          editSavefile(
            entry.data,
            s.voice_lang,
            s.text_lang,
            s.event_id
          );
        }
      }

      const out = rebuildVfs(vfsState.entries);
      const blob = new Blob([out], { type: "application/octet-stream" });
      const filename = `converted_${vfsState.filename}`;

      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = filename;

      hideStatus(convertStatus);
      downloadSec.hidden = false;
      vfsState = null;
    } catch (err) {
      showStatus(
        convertStatus,
        err instanceof Error ? err.message : String(err),
        "error"
      );
    } finally {
      convertBtn.disabled = false;
    }
  });

  restartBtn.addEventListener("click", resetAll);
});
