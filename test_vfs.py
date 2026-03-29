from pathlib import Path
import pytest
from vfs import parse_vfs, is_data_bin, get_savefile_langs

FIXTURES = Path(__file__).resolve().parent / "fixtures"

EXPECTED_NAMES = [
    "data0000.bin",
    "data0001.bin",
    "data0002.bin",
    "data0003.bin",
    "data0006.bin",
    "data0010.bin",
    "data0011.bin",
    "data0012.bin",
    "data0013.bin",
    "data0015.bin",
    "data0017.bin",
    "data0019.bin",
    "data0026.bin",
    "data0027.bin",
    "data0028.bin",
    "data0029.bin",
    "icon0001.png",
    "icon0010.png",
    "icon0011.png",
    "icon0012.png",
    "icon0013.png",
    "icon0015.png",
    "icon0017.png",
    "icon0019.png",
    "icon0026.png",
    "icon0027.png",
    "icon0028.png",
    "icon0029.png",
]


def test_parse_speedrun_vfs():
    raw = bytearray((FIXTURES / "speedrun.vfs").read_bytes())
    entries = parse_vfs(raw)
    names = [e.name for e in entries]
    assert names == EXPECTED_NAMES


def test_is_data_bin():
    data_names = [n for n in EXPECTED_NAMES if is_data_bin(n)]
    icon_names = [n for n in EXPECTED_NAMES if not is_data_bin(n)]
    assert all(n.startswith("data") for n in data_names)
    assert all(n.startswith("icon") for n in icon_names)
    assert len(data_names) == 16
    assert len(icon_names) == 12


def test_parse_no_deadbeef_raises():
    raw = bytearray((FIXTURES / "savedata_jp_no_deadbeef.vfs").read_bytes())
    with pytest.raises(ValueError, match="DEADBEEF"):
        parse_vfs(raw)


def test_parse_savedata_jp_valid():
    raw = bytearray((FIXTURES / "savedata_jp.vfs").read_bytes())
    entries = parse_vfs(raw)
    assert isinstance(entries, list)
    data_entries = [e for e in entries if is_data_bin(e.name)]
    assert len(data_entries) > 0


def test_savedata_jp_langs():
    raw = bytearray((FIXTURES / "savedata_jp.vfs").read_bytes())
    entries = parse_vfs(raw)
    data_entries = [e for e in entries if is_data_bin(e.name)]
    assert len(data_entries) > 0, "No valid data bins found"
    entry = data_entries[0]
    text, voice = get_savefile_langs(entry.data)
    assert voice == 0, f"{entry.name}: expected voice=0 (JP), got {voice}"
    assert text == 1, f"{entry.name}: expected text=1 (JP), got {text}"
