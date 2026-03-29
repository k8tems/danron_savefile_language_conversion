import re
from typing import List, Tuple

DEADBEEF = 0xDEADBEEF
DEADBEEF_BYTES = DEADBEEF.to_bytes(4, "little")


class VfsEntry:
    __slots__ = ("name", "data")

    def __init__(self, name: str, data: bytearray):
        self.name = name
        self.data = data


def read_u32(buf: bytearray, offset: int) -> int:
    return int.from_bytes(buf[offset:offset + 4], "little")


def write_u32(buf: bytearray, offset: int, value: int):
    buf[offset:offset + 4] = value.to_bytes(4, byteorder="little", signed=False)


def parse_vfs(raw: bytearray) -> List[VfsEntry]:
    entries: List[VfsEntry] = []
    p = 0
    while p + 4 <= len(raw):
        if read_u32(raw, p) == DEADBEEF:
            break
        name_len = read_u32(raw, p)
        p += 4
        name = raw[p:p + name_len].decode("utf-8")
        p += name_len
        data_len = read_u32(raw, p)
        p += 4
        data = bytearray(raw[p:p + data_len])
        p += data_len
        entries.append(VfsEntry(name, data))
    if raw[p:p + 4] != DEADBEEF_BYTES:
        raise ValueError(
            f"VFS does not end with 0xDEADBEEF (got {raw[p:p+4].hex()})"
        )
    return entries


def rebuild_vfs(entries: List[VfsEntry]) -> bytearray:
    out = bytearray()
    for e in entries:
        name_bytes = e.name.encode("utf-8")
        out += len(name_bytes).to_bytes(4, "little")
        out += name_bytes
        out += len(e.data).to_bytes(4, "little")
        out += e.data
    out += DEADBEEF_BYTES
    return out


def is_data_bin(name: str) -> bool:
    return bool(re.match(r"^data\d{4}\.bin$", name))


class Offset:
    TEXT = 0x31D - 0x14
    EVENT_ID = 0x354 - 0x14
    HEADER_CHECKSUM = 0x330 - 0x14
    VOICE = 0x1D394 - 0x14
    BODY_CHECKSUM = 0x3ACA4 - 0x14
    HEADER_RANGE = (0x2F8 - 0x14, 0x330 - 0x14)
    BODY_RANGE = (0x334 - 0x14, 0x3ACA4 - 0x14)
    MIN_FILE_SIZE = BODY_CHECKSUM + 4


def fix_checksum(buf: bytearray, sum_range: tuple[int, int], out_offset: int):
    start, end = sum_range
    write_u32(buf, out_offset, sum(buf[start:end]))


def get_savefile_langs(buf: bytearray) -> Tuple[int, int]:
    text = buf[Offset.TEXT]
    voice = buf[Offset.VOICE]
    return text, voice


def get_event_id(buf: bytearray) -> int:
    return read_u32(buf, Offset.EVENT_ID)


def edit_savefile(
    buf: bytearray,
    voice_lang: int,
    text_lang: int,
    event_id: int | None = None,
) -> None:
    buf[Offset.VOICE] = voice_lang
    buf[Offset.TEXT] = text_lang
    if event_id is not None:
        write_u32(buf, Offset.EVENT_ID, event_id)
    fix_checksum(buf, Offset.HEADER_RANGE, Offset.HEADER_CHECKSUM)
    fix_checksum(buf, Offset.BODY_RANGE, Offset.BODY_CHECKSUM)
