document.addEventListener("DOMContentLoaded", () => {
    const $ = (sel) => document.querySelector(sel);

    const uploadForm    = $("#upload-form");
    const fileInput     = $("#file-input");
    const uploadStatus  = $("#upload-status");
    const settingsSec   = $("#settings-section");
    const downloadSec   = $("#download-section");
    const convertBtn    = $("#convert-btn");
    const restartBtn    = $("#restart-btn");
    const convertStatus = $("#convert-status");
    const downloadLink  = $("#download-link");
    const bulkVoice     = $("#bulk-voice");
    const bulkText      = $("#bulk-text");
    const bulkApplyBtn  = $("#bulk-apply-btn");
    const subfilesTbody = $("#subfiles-tbody");

    let fileId = null;

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
        fileId = null;
        subfilesTbody.innerHTML = "";

        const href = downloadLink.getAttribute("href");
        if (href && href.startsWith("blob:")) {
            URL.revokeObjectURL(href);
        }
        downloadLink.removeAttribute("href");
        downloadLink.removeAttribute("download");
    }

    function buildSubfileRows(files) {
        subfilesTbody.innerHTML = "";
        files.forEach((f) => {
            const tr = document.createElement("tr");
            tr.dataset.name = f.name;
            tr.innerHTML =
                '<td class="label-cell">' + f.name + "</td>" +
                '<td><span class="current-val">' + f.voice_lang_name + "</span></td>" +
                '<td><select class="retro-select voice-sel">' + LANG_OPTIONS + "</select></td>" +
                '<td><span class="current-val">' + f.text_lang_name + "</span></td>" +
                '<td><select class="retro-select text-sel">' + LANG_OPTIONS + "</select></td>";
            tr.querySelector(".voice-sel").value = f.voice_lang;
            tr.querySelector(".text-sel").value = f.text_lang;
            subfilesTbody.appendChild(tr);
        });
    }

    /* ---- Bulk apply ---- */
    bulkApplyBtn.addEventListener("click", () => {
        const v = bulkVoice.value;
        const t = bulkText.value;
        subfilesTbody.querySelectorAll("tr").forEach((tr) => {
            if (v !== "") tr.querySelector(".voice-sel").value = v;
            if (t !== "") tr.querySelector(".text-sel").value = t;
        });
    });

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
            buildSubfileRows(data.subfiles);

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

        const settings = [];
        subfilesTbody.querySelectorAll("tr").forEach((tr) => {
            settings.push({
                name: tr.dataset.name,
                voice_lang: parseInt(tr.querySelector(".voice-sel").value),
                text_lang: parseInt(tr.querySelector(".text-sel").value),
            });
        });

        try {
            const res = await fetch("/api/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file_id: fileId, settings }),
            });
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
