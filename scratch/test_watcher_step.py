import os
import json
import time
from app.services.watcher_service import workspace_watcher
from app.services.rag_service import hybrid_retriever

def test_step():
    repo_path = "/Users/harshitgangwar/Desktop/2.WEBDEV/devpilot-ai"
    test_file_path = os.path.join(repo_path, "test_watcher_temp.py")
    unique_string = "SPECIAL_STEP_TOKEN_12345"

    # Set active_repo.json
    with open("active_repo.json", "w") as f:
        json.dump({"name": "devpilot-ai", "path": repo_path}, f)

    print("--- STEP 1: Run watcher reload (first check) ---")
    workspace_watcher._check_workspace()
    print(f"File mtimes keys: {list(workspace_watcher.file_mtimes.keys())[:3]}... Total: {len(workspace_watcher.file_mtimes)}")
    print(f"Initial loaded: {workspace_watcher.initial_loaded}")
    print(f"Active path: {workspace_watcher.active_path}")

    # Create file
    print(f"\n--- STEP 2: Creating file {test_file_path} ---")
    with open(test_file_path, "w") as f:
        f.write(f"def get_step_secret():\n    return '{unique_string}'\n")

    print("\n--- STEP 3: Run watcher scan (second check) ---")
    # This should detect the new file and re-index it!
    workspace_watcher._check_workspace()

    print("\n--- STEP 4: Searching RAG index for token ---")
    docs = hybrid_retriever.search("get_step_secret", k=5)
    print(f"Search results count: {len(docs)}")
    found = False
    for doc in docs:
        text = doc["text"] if isinstance(doc, dict) else doc
        print(f"Retrieved: {text[:200]}...")
        if unique_string in text:
            found = True
            
    if found:
        print("\n🎉 SUCCESS! Polling step correctly detected and indexed the new file!")
    else:
        print("\n❌ FAILURE! The unique token was not found in the local RAG search.")

    # Cleanup
    if os.path.exists(test_file_path):
        os.remove(test_file_path)

if __name__ == "__main__":
    test_step()
