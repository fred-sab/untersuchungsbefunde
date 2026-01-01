#!/usr/bin/env python3
from __future__ import annotations

import http.server
import socketserver
import sys
from pathlib import Path


class NoCacheRequestHandler(http.server.SimpleHTTPRequestHandler):
    # Serve files from the directory where serve.py lives (project root)
    def __init__(self, *args, **kwargs):
        root = Path(__file__).resolve().parent
        super().__init__(*args, directory=str(root), **kwargs)

    def end_headers(self) -> None:
        # Helpful during development so changes show up immediately
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> int:
    ports = [8000, 5173, 3000, 8080]  # try a few common dev ports
    host = "127.0.0.1"

    for port in ports:
        try:
            with socketserver.TCPServer((host, port), NoCacheRequestHandler) as httpd:
                url = f"http://{host}:{port}/"
                print(f"Serving {Path(__file__).resolve().parent} at {url}")
                print("Press Ctrl+C to stop.")
                httpd.serve_forever()
                return 0
        except OSError:
            continue

    print("No free port found among: " + ", ".join(map(str, ports)), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
