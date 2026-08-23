import os
import json
import time
import threading
from app.routes.upload_repo import (
    chunk_by_ast, 
    chunk_code_lines, 
    SUPPORTED_EXT, 
    EXCLUDED_DIRS, 
    read_file
)
from app.services.rag_service import hybrid_retriever

ACTIVE_REPO_FILE = "active_repo.json"

class WorkspaceWatcher:
    def __init__(self):
        self.active_path = None
        self.file_mtimes = {}
        self.running = False
        self.thread = None
        self.initial_loaded = False

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print("[Auto-Watcher] Workspace file watcher started background loop.")

    def stop(self):
        self.running = False

    def _run_loop(self):
        while self.running:
            try:
                self._check_workspace()
            except Exception as e:
                print(f"[Auto-Watcher] Error checking workspace: {e}")
            time.sleep(2.0)

    def _check_workspace(self):
        if not os.path.exists(ACTIVE_REPO_FILE):
            return

        try:
            with open(ACTIVE_REPO_FILE) as f:
                data = json.load(f)
                current_path = data.get("path")
        except Exception:
            return

        if not current_path or not os.path.exists(current_path):
            return

        # If we switched active repo, clear cache and reload mtimes
        if current_path != self.active_path:
            print(f"[Auto-Watcher] Switched to new active repo: {current_path}. Loading mtimes...")
            self.active_path = current_path
            self.file_mtimes = {}
            self.initial_loaded = False
            self._load_all_files()
            self.initial_loaded = True
            return

        # Scan active repo for modified or deleted files
        found_files = set()
        for root, dirs, files in os.walk(self.active_path):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]

            for file in files:
                if file.endswith(SUPPORTED_EXT):
                    full_path = os.path.join(root, file)
                    found_files.add(full_path)
                    try:
                        mtime = os.path.getmtime(full_path)
                    except OSError:
                        continue

                    # If file is new or modified
                    if full_path not in self.file_mtimes:
                        self.file_mtimes[full_path] = mtime
                        if self.initial_loaded:
                            self._reindex_file(full_path, file)
                        continue

                    if mtime > self.file_mtimes[full_path]:
                        self.file_mtimes[full_path] = mtime
                        self._reindex_file(full_path, file)

        # Check for deleted files
        deleted_files = set(self.file_mtimes.keys()) - found_files
        for full_path in deleted_files:
            print(f"[Auto-Watcher] Deleted file detected: {full_path}. Removing from index...")
            try:
                hybrid_retriever.remove_file(full_path)
            except Exception as e:
                print(f"[Auto-Watcher] Error removing index for {full_path}: {e}")
            del self.file_mtimes[full_path]

    def _load_all_files(self):
        for root, dirs, files in os.walk(self.active_path):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
            for file in files:
                if file.endswith(SUPPORTED_EXT):
                    full_path = os.path.join(root, file)
                    try:
                        self.file_mtimes[full_path] = os.path.getmtime(full_path)
                    except OSError:
                        continue

    def _reindex_file(self, full_path: str, filename: str):
        print(f"[Auto-Watcher] Modified file detected: {full_path}. Re-indexing...")
        content = read_file(full_path)
        if not content.strip():
            # If file was emptied, just remove old chunks
            hybrid_retriever.remove_file(full_path)
            return

        # 1. Remove old index chunks
        hybrid_retriever.remove_file(full_path)

        # 2. Generate new chunks
        if filename.endswith(".py"):
            chunks = chunk_by_ast(content, full_path)
        else:
            raw_chunks = chunk_code_lines(content, chunk_size=30, overlap=10)
            chunks = [
                f"# File: {full_path}\n\n{chunk}"
                for chunk in raw_chunks
            ]

        new_chunks = []
        new_meta = []
        for chunk in chunks:
            if chunk.strip():
                new_chunks.append(
                    f"\nFILE: {full_path}\nSOURCE: {filename}\n\n{chunk}\n"
                )
                new_meta.append({
                    "source": filename,
                    "path": full_path,
                    "extension": os.path.splitext(filename)[1]
                })

        # 3. Add to retrievers
        if new_chunks:
            hybrid_retriever.add_documents(new_chunks, new_meta)
            print(f"[Auto-Watcher] Re-indexed {len(new_chunks)} chunks for {filename} successfully.")

workspace_watcher = WorkspaceWatcher()
