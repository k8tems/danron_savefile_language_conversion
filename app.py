import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uuid
import uvicorn
from dotenv import load_dotenv
from savefile import edit_savefile, is_file_large_enough

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

    if is_file_large_enough(data):
        raise HTTPException(400, "ファイルが小さすぎます。有効なセーブファイルではありません。")

    from savefile import get_savefile_langs
    text, voice = get_savefile_langs(data)

    file_id = str(uuid.uuid4())
    file_store[file_id] = {"data": data, "filename": file.filename or "savefile.vfs"}

    return {
        "file_id": file_id,
        "voice_lang": voice,
        "text_lang": text,
        "voice_lang_name": LANG_NAMES.get(voice, f"不明 ({voice})"),
        "text_lang_name": LANG_NAMES.get(text, f"不明 ({text})"),
    }

@app.post("/api/convert")
async def convert(
    file_id: str = Form(...),
    voice_lang: int = Form(...),
    text_lang: int = Form(...),
):
    entry = file_store.pop(file_id, None)
    if not entry:
        raise HTTPException(404, "ファイルが見つかりません。再アップロードしてください。")

    buf = entry["data"]
    filename = entry["filename"]

    edit_savefile(buf, voice_lang, text_lang)

    return Response(
        content=bytes(buf),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="converted_{filename}"'
        },
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=os.environ['PORT'])
