import re
from typing import List

DEADBEEF = 0xDEADBEEF
DEADBEEF_BYTES = DEADBEEF.to_bytes(4, "little")


class VfsEntry:
    __slots__ = ("name", "data")

    def __init__(self, name: str, data: bytearray):
        self.name = name
        self.data = data


def _read_u32(buf, offset: int) -> int:
    return int.from_bytes(buf[offset:offset + 4], "little")


def parse_vfs(raw: bytearray) -> List[VfsEntry]:
    entries: List[VfsEntry] = []
    p = 0
    while p + 4 <= len(raw):
        if _read_u32(raw, p) == DEADBEEF:
            break
        name_len = _read_u32(raw, p)
        p += 4
        name = raw[p:p + name_len].decode("utf-8")
        p += name_len
        data_len = _read_u32(raw, p)
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
