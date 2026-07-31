"""
Ai clanked based on https://s2v.app/ValveResourceFormat/guides/read-resource.html
"""

import struct
import sys
from pathlib import Path


def create_vjs_c(js_path: str, output_path: str):
  with open(js_path, "rb") as f:
    script = f.read()

  buf = bytearray()

  # Resource header
  buf.extend(struct.pack("<I", 0))   # total size (patched later)
  buf.extend(struct.pack("<H", 12))  # header version
  buf.extend(struct.pack("<H", 4))   # resource version
  buf.extend(struct.pack("<I", 8))   # block table offset
  buf.extend(struct.pack("<I", 1))   # block count

  # Block header
  buf.extend(struct.pack("<I", 0x41544144))  # "DATA"
  buf.extend(struct.pack("<I", 8))           # relative data offset
  buf.extend(struct.pack("<I", len(script))) # data size

  # Block data
  buf.extend(script)

  # Patch total size
  struct.pack_into("<I", buf, 0, len(buf))

  with open(output_path, "wb") as f:
    _ = f.write(buf)


def main():
  if len(sys.argv) != 2:
    print(f"Usage: python {Path(sys.argv[0]).name} <input.js>")
    sys.exit(1)

  input_file = Path(sys.argv[1])

  if not input_file.exists():
    print(f"Error: File not found: {input_file}")
    sys.exit(1)

  output_file = input_file.with_suffix(".vjs_c")

  create_vjs_c(str(input_file), str(output_file))

  print(f"Created: {output_file}")


if __name__ == "__main__":
  main()
