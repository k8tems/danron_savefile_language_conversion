from typing import Tuple

class Offset:
    TEXT = 0x31D
    HEADER_CHECKSUM = 0x330
    VOICE = 0x1D394
    BODY_CHECKSUM = 0x3ACA4
    HEADER_RANGE = (0x2F8, 0x330)
    BODY_RANGE = (0x334, 0x3ACA4)
    MIN_FILE_SIZE = BODY_CHECKSUM + 4


def write_u32(buf: bytearray, offset: int, value: int):
    buf[offset:offset + 4] = value.to_bytes(4, byteorder="little", signed=False)


def fix_checksum(buf: bytearray, sum_range: tuple[int, int], out_offset: int):
    start, end = sum_range
    write_u32(buf, out_offset, sum(buf[start:end]))


def is_file_large_enough(buf: bytearray) -> bool:
    return len(buf) < Offset.MIN_FILE_SIZE


def get_savefile_langs(buf: bytearray) -> Tuple[int, int]:
    text = buf[Offset.TEXT]
    voice = buf[Offset.VOICE]
    return text, voice


def edit_savefile(
    buf: bytearray,
    voice_lang: int,
    text_lang: int
) -> None:
    buf[Offset.VOICE] = voice_lang
    buf[Offset.TEXT] = text_lang
    fix_checksum(buf, Offset.HEADER_RANGE, Offset.HEADER_CHECKSUM)
    fix_checksum(buf, Offset.BODY_RANGE, Offset.BODY_CHECKSUM)
