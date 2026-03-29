from utils import *

vfs_jp_name = r'../../basesaves/savedata_jp_txt.vfs'
vfs_sr_name = r'savedata_en_txt_すらっち.vfs'

vfs_jp = read_bytearray_file(vfs_jp_name)
vfs_sr = read_bytearray_file(vfs_sr_name)

vfs_mod = vfs_sr.copy()

class DRLang:
    EN = 0
    JP = 1
    CN = 2

class DRSaveFileOffset:
    VoiceLang = 0x31C
    TextLang = 0x31D
    HeaderChecksum = 0x330
    GameProgressIdk = 0x354
    BodyChecksum = 0x3ACA4
    HeaderChecksumRange = (0x2F8, HeaderChecksum)  # これがあるからIntEnumに出来ない
    BodyChecksumRange = (0x334, BodyChecksum)

vfs_mod[DRSaveFileOffset.VoiceLang] = DRLang.CN
vfs_mod[DRSaveFileOffset.TextLang] = DRLang.JP
vfs_mod[0x3A770] = DRLang.CN
vfs_mod[0x10394] = DRLang.CN

vfs_mod = set_checksum(
    vfs_mod, sum_rng=DRSaveFileOffset.HeaderChecksumRange, 
    out_offset=DRSaveFileOffset.HeaderChecksum)

# これを変えると進捗状況が変わる？
# copy_u32(vfs_mod, vfs_jp, DRSaveFileOffset.GameProgressIdk)

vfs_mod = set_checksum(
    vfs_mod, sum_rng=DRSaveFileOffset.BodyChecksumRange,
    out_offset=DRSaveFileOffset.BodyChecksum)

modded_save_path = f"{now_str()}_surachi.vfs"
write_file(modded_save_path, vfs_mod)