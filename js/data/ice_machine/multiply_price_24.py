import os
import json

# 🔍 Lấy đường dẫn thư mục hiện tại nơi chứa file .py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def multiply_prices_in_json(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"⚠️ Bỏ qua file lỗi JSON: {file_path}")
        return

    changed = False

    def process_item(item):
        nonlocal changed
        if isinstance(item, dict):
            for k, v in item.items():
                if k == "price" and isinstance(v, (int, float)):
                    item[k] = round(v * 24, 2)
                    changed = True
                elif isinstance(v, (dict, list)):
                    process_item(v)
        elif isinstance(item, list):
            for elem in item:
                process_item(elem)

    process_item(data)

    if changed:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✅ Đã nhân giá *24 trong: {os.path.basename(file_path)}")
    else:
        print(f"➡️ Không có trường 'price' trong: {os.path.basename(file_path)}")

def main():
    for root, _, files in os.walk(BASE_DIR):
        for file in files:
            if file.endswith(".json"):
                multiply_prices_in_json(os.path.join(root, file))

if __name__ == "__main__":
    main()
