import re
import sys
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


# =========================
# CONFIG
# =========================
# File này nằm ở: D:\minafood\minafood\tool_update_anh\update_gallery.py
# => parent      = tool_update_anh
# => parent.parent = minafood
BASE_DIR = Path(__file__).resolve().parent.parent
TOOL_DIR = Path(__file__).resolve().parent

SOURCE_DIR = TOOL_DIR / "img"
DEST_DIR = BASE_DIR / "img" / "customer_galary"
JS_FILE = BASE_DIR / "js" / "img_galary.js"

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
FORCE_PNG = True


def log(msg: str) -> None:
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] {msg}")


def run_cmd(cmd, cwd: Path) -> None:
    log(f"Chạy lệnh: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(cwd), text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Lệnh thất bại: {' '.join(cmd)}")


def get_source_images(source_dir: Path):
    if not source_dir.exists():
        raise FileNotFoundError(f"Không tìm thấy thư mục nguồn: {source_dir}")

    files = []
    for f in source_dir.iterdir():
        if f.is_file() and f.suffix.lower() in ALLOWED_EXTENSIONS:
            files.append(f)

    files.sort(key=lambda x: x.name.lower())
    return files


def parse_max_gallery_number(js_text: str) -> int:
    matches = re.findall(r'galary_(\d+)', js_text, flags=re.IGNORECASE)
    if not matches:
        return 0
    return max(int(x) for x in matches)


def build_new_entries(start_num: int, count: int):
    return [f"img/customer_galary/galary_{i}.png" for i in range(start_num, start_num + count)]


def update_image_list_in_js(js_path: Path, new_entries: list[str]) -> None:
    if not js_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file JS: {js_path}")

    text = js_path.read_text(encoding="utf-8")

    max_num = parse_max_gallery_number(text)
    log(f"Số gallery lớn nhất hiện tại: {max_num}")

    array_match = re.search(
        r"(const\s+imageList\s*=\s*\[)(.*?)(\]\s*;)",
        text,
        flags=re.DOTALL
    )
    if not array_match:
        raise ValueError("Không tìm thấy biến imageList")

    prefix = array_match.group(1)
    body = array_match.group(2)
    suffix = array_match.group(3)

    existing_body = body.rstrip()

    today = datetime.now().strftime("%d-%m-%Y")

    # 🔥 block thêm mới
    new_block = "\n"
    new_block += f"    // thêm ảnh ngày {today}\n"
    new_block += "\n".join([f'    "{item}",' for item in new_entries])
    new_block += "\n"

    if existing_body.strip():
        if not existing_body.strip().endswith(","):
            existing_body += ","

    new_array = f"{prefix}{existing_body}{new_block}{suffix}"
    new_text = text[:array_match.start()] + new_array + text[array_match.end():]

    js_path.write_text(new_text, encoding="utf-8")
    log(f"Đã thêm {len(new_entries)} ảnh vào JS (có comment ngày)")


def copy_and_rename_images(source_files: list[Path], dest_dir: Path, start_num: int) -> list[str]:
    dest_dir.mkdir(parents=True, exist_ok=True)

    new_names = []

    for idx, src in enumerate(source_files, start=start_num):
        new_name = f"galary_{idx}.png"
        final_path = dest_dir / new_name

        if final_path.exists():
            raise FileExistsError(f"File đích đã tồn tại: {final_path}")

        ext = src.suffix.lower()

        if FORCE_PNG:
            if ext == ".png":
                shutil.copy2(src, final_path)
            else:
                if not PIL_AVAILABLE:
                    raise RuntimeError(
                        f"Ảnh {src.name} không phải PNG và máy chưa cài Pillow để convert sang PNG.\n"
                        f"Cài bằng lệnh: pip install pillow"
                    )
                with Image.open(src) as im:
                    if im.mode in ("RGBA", "LA", "P"):
                        im = im.convert("RGBA")
                    else:
                        im = im.convert("RGB")
                    im.save(final_path, format="PNG")
        else:
            shutil.copy2(src, final_path)

        new_names.append(new_name)
        log(f"Đã thêm ảnh: {src.name} -> {new_name}")

    return new_names


def git_commit_and_push(base_dir: Path, image_count: int) -> None:
    today = datetime.now().strftime("%d-%m-%Y")
    commit_message = f"update anh ngay {today} voi {image_count} anh"

    run_cmd(["git", "add", "."], cwd=base_dir)

    log(f"Tạo commit: {commit_message}")
    commit_result = subprocess.run(
        ["git", "commit", "-m", commit_message],
        cwd=str(base_dir),
        text=True
    )
    if commit_result.returncode != 0:
        raise RuntimeError("Git commit thất bại. Có thể không có thay đổi hoặc repo đang lỗi.")

    run_cmd(["git", "push"], cwd=base_dir)


def main():
    log("=== BẮT ĐẦU UPDATE ẢNH GALLERY ===")
    log(f"Thư mục tool: {TOOL_DIR}")
    log(f"Thư mục gốc project: {BASE_DIR}")
    log(f"Thư mục nguồn: {SOURCE_DIR}")
    log(f"Thư mục đích: {DEST_DIR}")
    log(f"File JS: {JS_FILE}")

    source_files = get_source_images(SOURCE_DIR)
    new_count = len(source_files)

    if new_count == 0:
        log("Không có ảnh mới trong thư mục nguồn. Kết thúc.")
        return

    log(f"Số ảnh mới phát hiện: {new_count}")

    if not JS_FILE.exists():
        raise FileNotFoundError(f"Không tìm thấy file JS: {JS_FILE}")

    js_text = JS_FILE.read_text(encoding="utf-8")
    max_num = parse_max_gallery_number(js_text)
    start_num = max_num + 1

    planned_names = [f"galary_{i}.png" for i in range(start_num, start_num + new_count)]
    log(f"Tên ảnh mới sẽ là: {', '.join(planned_names)}")

    copy_and_rename_images(source_files, DEST_DIR, start_num)

    new_entries = build_new_entries(start_num, new_count)
    update_image_list_in_js(JS_FILE, new_entries)

    git_commit_and_push(BASE_DIR, new_count)

    log("=== HOÀN TẤT UPDATE ẢNH GALLERY ===")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"LỖI: {e}")
        sys.exit(1)