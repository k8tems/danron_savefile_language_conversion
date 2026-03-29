document.addEventListener("DOMContentLoaded", () => {
    const $ = (sel) => document.querySelector(sel);

    const uploadForm   = $("#upload-form");
    const fileInput    = $("#file-input");
    const uploadStatus = $("#upload-status");
    const settingsSec  = $("#settings-section");
    const downloadSec  = $("#download-section");
    const convertBtn   = $("#convert-btn");
    const restartBtn   = $("#restart-btn");
    const currentVoice = $("#current-voice");
    const currentText  = $("#current-text");
    const voiceSelect  = $("#voice-select");
    const textSelect   = $("#text-select");
    const convertStatus = $("#convert-status");
    const downloadLink = $("#download-link");

    let fileId = null;

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
        fileId = null;

        const href = downloadLink.getAttribute("href");
        if (href && href.startsWith("blob:")) {
            URL.revokeObjectURL(href);
        }
        downloadLink.removeAttribute("href");
        downloadLink.removeAttribute("download");
    }

    /* ---- Upload ---- */
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!fileInput.files.length) {
            showStatus(uploadStatus, "ファイルを選択してください。", "error");
            return;
        }

        showStatus(uploadStatus, "アップロード中…", "loading");
        settingsSec.hidden = true;
        downloadSec.hidden = true;

        const body = new FormData();
        body.append("file", fileInput.files[0]);

        try {
            const res = await fetch("/api/upload", { method: "POST", body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "アップロードに失敗しました。");

            fileId = data.file_id;
            currentVoice.textContent = data.voice_lang_name;
            currentText.textContent  = data.text_lang_name;
            voiceSelect.value = data.voice_lang;
            textSelect.value  = data.text_lang;

            hideStatus(uploadStatus);
            settingsSec.hidden = false;
            downloadSec.hidden = true;
        } catch (err) {
            showStatus(uploadStatus, err.message, "error");
        }
    });

    /* ---- Convert ---- */
    convertBtn.addEventListener("click", async () => {
        if (!fileId) return;

        convertBtn.disabled = true;
        showStatus(convertStatus, "変換中…", "loading");

        const body = new FormData();
        body.append("file_id", fileId);
        body.append("voice_lang", voiceSelect.value);
        body.append("text_lang", textSelect.value);

        try {
            const res = await fetch("/api/convert", { method: "POST", body });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "変換に失敗しました。");
            }

            const blob = await res.blob();
            let filename = "converted_savefile.vfs";
            const cd = res.headers.get("Content-Disposition");
            if (cd) {
                const m = cd.match(/filename="?([^"]+)"?/);
                if (m) filename = m[1];
            }

            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = filename;

            hideStatus(convertStatus);
            downloadSec.hidden = false;
            fileId = null;
        } catch (err) {
            showStatus(convertStatus, err.message, "error");
        } finally {
            convertBtn.disabled = false;
        }
    });

    /* ---- Restart ---- */
    restartBtn.addEventListener("click", resetAll);
});
