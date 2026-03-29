import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import HTMLResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uuid
import uvicorn
from dotenv import load_dotenv
from savefile import edit_savefile, is_file_large_enough, get_savefile_langs
from vfs import parse_vfs, rebuild_vfs, is_data_bin

load_dotenv()

app = FastAPI(title="セーブファイル言語変換")

BASE_DIR = Path(__file__).resolve().parent

file_store: dict[str, dict] = {}

LANG_NAMES = {0: "English", 1: "日本語", 2: "中文"}

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def index():
    return (BASE_DIR / "static" / "index.html").read_text(encoding="utf-8")


@app.get("/header.png")
async def header():
    return FileResponse(BASE_DIR / "header.png")


@app.get("/sayaka.png")
async def sayaka():
    return FileResponse(BASE_DIR / "sayaka.png")


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    data = bytearray(await file.read())
    entries, trailing = parse_vfs(data)

    subfiles = []
    for entry in entries:
        if not is_data_bin(entry.name):
            continue
        if is_file_large_enough(entry.data):
            continue
        text, voice = get_savefile_langs(entry.data)
        subfiles.append({
            "name": entry.name,
            "voice_lang": voice,
            "text_lang": text,
            "voice_lang_name": LANG_NAMES.get(voice, f"不明 ({voice})"),
            "text_lang_name": LANG_NAMES.get(text, f"不明 ({text})"),
        })

    if not subfiles:
        raise HTTPException(400, "有効なセーブデータが見つかりませんでした。")

    file_id = str(uuid.uuid4())
    file_store[file_id] = {
        "entries": entries,
        "trailing": trailing,
        "filename": file.filename or "savefile.vfs",
    }

    return {"file_id": file_id, "subfiles": subfiles}


@app.post("/api/convert")
async def convert(request: Request):
    body = await request.json()
    file_id = body["file_id"]
    settings = body["settings"]

    entry_data = file_store.pop(file_id, None)
    if not entry_data:
        raise HTTPException(404, "ファイルが見つかりません。再アップロードしてください。")

    entries = entry_data["entries"]
    trailing = entry_data["trailing"]
    filename = entry_data["filename"]

    settings_map = {s["name"]: s for s in settings}
    for entry in entries:
        if entry.name in settings_map:
            s = settings_map[entry.name]
            edit_savefile(entry.data, s["voice_lang"], s["text_lang"])

    result = rebuild_vfs(entries, trailing)

    return Response(
        content=bytes(result),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="converted_{filename}"'
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=os.environ['PORT'])
