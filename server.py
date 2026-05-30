import os
import json
import re
import http.server
import socketserver

PORT = 8000
DIRECTORY = "."

_SAFE_FILENAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")


def _sanitize_filename(raw_filename):
    filename = os.path.basename(str(raw_filename or "").replace("\\", "/"))
    if not filename or filename in {".", ".."}:
        return None
    if filename != raw_filename or not _SAFE_FILENAME_RE.fullmatch(filename):
        return None
    return filename

class DualServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        # Enable CORS for local testing if needed
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/upload-image":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                filename = _sanitize_filename(payload.get("filename"))
                base64_data = payload.get("base64")
                upload_type = payload.get("type", "member")

                if not filename or not base64_data:
                    raise ValueError("Invalid upload payload")
                
                if "," in base64_data:
                    base64_data = base64_data.split(",")[1]
                
                import base64 as b64
                img_data = b64.b64decode(base64_data)
                
                folder_map = {
                    "member": "members",
                    "project": "projects",
                    "post": "projects"
                }
                subfolder = folder_map.get(upload_type, "members")
                
                dest_dir = os.path.join(DIRECTORY, "img", subfolder)
                os.makedirs(dest_dir, exist_ok=True)
                
                file_path = os.path.join(dest_dir, filename)
                with open(file_path, "wb") as f:
                    f.write(img_data)
                    
                saved_path = f"img/{subfolder}/{filename}"
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "path": saved_path}).encode('utf-8'))
                print(f"[SUCCESS] Uploaded image saved to {file_path}")
                return
            except Exception as e:
                print(f"[ERROR] Failed to save uploaded image: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Upload failed"}).encode('utf-8'))
                return

        if self.path.startswith("/api/save/"):
            file_type = self.path.split("/")[-1]  # 'members', 'publications', 'projects', 'posts'
            if file_type in ["members", "publications", "projects", "posts"]:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                try:
                    data = json.loads(post_data.decode('utf-8'))
                    # Path to data directory
                    file_path = os.path.join(DIRECTORY, "data", f"{file_type}.json")
                    
                    # Ensure directory exists
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    
                    with open(file_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success", "message": f"Successfully saved {file_type}.json directly!"}).encode('utf-8'))
                    print(f"[SUCCESS] Saved {file_type}.json directly to local folder.")
                    return
                except Exception as e:
                    self.send_response(500)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
                    print(f"[ERROR] Failed to save {file_type}.json: {e}")
                    return
        
        # Fall back to standard SimpleHTTPRequestHandler behavior
        super().do_POST()

if __name__ == "__main__":
    # Allow port reuse to avoid 'address already in use' errors during fast restarts
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DualServer) as httpd:
        print(f"NEPEM local server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
