# from types import Tuple  # cannot import ...?
import os
import hashlib
from pathlib import Path
import shutil
from datetime import datetime

def sha256(file_path):
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    return hashlib.sha256(file_bytes).hexdigest()

def read_file(f_name):
    with open(f_name, 'rb') as f:
        return f.read()
        
def write_file(f_name, data):
    with open(f_name, 'wb') as f:
        f.write(data)

def read_bytearray_file(f_name):
    return bytearray(read_file(f_name))

def write_u32(buf: bytearray, offset: int, value: int, byteorder="little"):
    """
    Write a 4-byte unsigned integer at the specified offset (in-place).
    """
    buf[offset:offset + 4] = value.to_bytes(4, byteorder=byteorder, signed=False)
    return buf

def read_u32(buf: bytes | bytearray, offset: int, byteorder="little") -> int:
    """
    Read a 4-byte unsigned integer from the specified offset.
    """
    return int.from_bytes(buf[offset:offset + 4], byteorder=byteorder, signed=False)

def copy_u32(vfs_dst, vfs_src, offset):
    v = read_u32(vfs_src, offset)
    return write_u32(vfs_dst, offset=offset, value=v)

def set_checksum(buf: bytearray, sum_rng, out_offset, byteorder="little"):
    """
    Compute sum over [start:end) and write it as 4 bytes at out_offset (in-place).
    """
    start, end = sum_rng
    write_u32(buf, out_offset, sum(buf[start:end]))
    return buf

def now_str():
    return datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
