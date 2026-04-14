import streamlit as st
import requests
import json
import os
import sys

api_key = st.secrets["OPENROUTER_API_KEY"]
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

API_BASE = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="DevPilot",
    page_icon="⬡",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');

*, *::before, *::after { box-sizing: border-box; }

html, body, [class*="css"] {
    font-family: 'IBM Plex Mono', monospace;
    background: #0c0c0e;
    color: #c8c8cc;
}

#MainMenu, footer, header { visibility: hidden; }
.block-container { padding: 0 !important; max-width: 100% !important; }

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    background: #0c0c0e !important;
    border-right: 1px solid #1c1c22 !important;
    padding: 0 !important;
}
[data-testid="stSidebar"] > div:first-child {
    padding: 28px 20px 20px !important;
}
[data-testid="stSidebar"] * {
    font-family: 'IBM Plex Mono', monospace !important;
}

/* Logo */
[data-testid="stSidebar"] h1,
[data-testid="stSidebar"] h2,
[data-testid="stSidebar"] h3 {
    font-family: 'Instrument Serif', serif !important;
    font-weight: 400 !important;
    font-style: italic !important;
    color: #f0f0f2 !important;
    letter-spacing: -0.5px !important;
}

/* Radio nav */
[data-testid="stSidebar"] .stRadio > label {
    font-size: 0.7rem !important;
    color: #44444e !important;
    letter-spacing: 0.08em !important;
    text-transform: uppercase !important;
    margin-bottom: 8px !important;
}
[data-testid="stSidebar"] .stRadio div[role="radiogroup"] {
    gap: 2px !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"] {
    background: transparent !important;
    padding: 8px 10px !important;
    border-radius: 6px !important;
    border: none !important;
    transition: background 0.15s !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"]:hover {
    background: #13131a !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"] p {
    font-size: 0.75rem !important;
    color: #8888a0 !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"][aria-checked="true"] {
    background: #13131a !important;
    border-left: 2px solid #c8c0a8 !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"][aria-checked="true"] p {
    color: #e8e8e0 !important;
}

/* Sidebar divider */
[data-testid="stSidebar"] hr {
    border-color: #1c1c22 !important;
    margin: 16px 0 !important;
}

/* Sidebar inputs */
[data-testid="stSidebar"] .stTextInput > div > div > input {
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.73rem !important;
    background: #13131a !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 6px !important;
    color: #c8c8cc !important;
    padding: 8px 10px !important;
    transition: border-color 0.15s !important;
}
[data-testid="stSidebar"] .stTextInput > div > div > input:focus {
    border-color: #c8c0a8 !important;
    box-shadow: none !important;
}
[data-testid="stSidebar"] .stTextInput label {
    font-size: 0.68rem !important;
    color: #44444e !important;
    text-transform: uppercase !important;
    letter-spacing: 0.06em !important;
}

/* Sidebar buttons */
[data-testid="stSidebar"] .stButton > button {
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.7rem !important;
    font-weight: 500 !important;
    background: #13131a !important;
    color: #8888a0 !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 6px !important;
    padding: 6px 10px !important;
    width: 100% !important;
    transition: all 0.15s !important;
    letter-spacing: 0.04em !important;
}
[data-testid="stSidebar"] .stButton > button:hover {
    background: #1c1c28 !important;
    color: #c8c8cc !important;
    border-color: #2c2c38 !important;
}

/* Selectbox */
[data-testid="stSidebar"] .stSelectbox > div > div {
    background: #13131a !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 6px !important;
    font-size: 0.73rem !important;
    color: #c8c8cc !important;
}

/* Success / Error */
.stSuccess {
    background: #0d1a10 !important;
    border: 1px solid #1a3320 !important;
    border-radius: 6px !important;
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.72rem !important;
    color: #5a9e6a !important;
}
.stError {
    background: #1a0d0d !important;
    border: 1px solid #331a1a !important;
    border-radius: 6px !important;
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.72rem !important;
}
.stInfo {
    background: #0d0d1a !important;
    border: 1px solid #1a1a33 !important;
    border-radius: 6px !important;
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.72rem !important;
}

/* ── Main area ── */
.main-header {
    padding: 22px 32px 18px;
    border-bottom: 1px solid #1c1c22;
    display: flex;
    align-items: baseline;
    gap: 12px;
}

/* Chat messages */
[data-testid="stChatMessage"] {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 14px 32px !important;
    margin: 0 !important;
    border-bottom: 1px solid #13131a !important;
    font-family: 'IBM Plex Mono', monospace !important;
}
[data-testid="stChatMessage"]:hover {
    background: #0e0e12 !important;
}
[data-testid="stChatMessage"] p {
    font-size: 0.82rem !important;
    line-height: 1.75 !important;
    color: #c8c8cc !important;
    margin: 0 !important;
}
[data-testid="stChatMessage"] [data-testid="stMarkdownContainer"] {
    font-family: 'IBM Plex Mono', monospace !important;
}

/* Avatar override */
[data-testid="stChatMessage"] [data-testid="chatAvatarIcon-user"],
[data-testid="stChatMessage"] [data-testid="chatAvatarIcon-assistant"] {
    background: #13131a !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 4px !important;
    width: 28px !important;
    height: 28px !important;
    font-size: 0.65rem !important;
    color: #8888a0 !important;
}

/* Code blocks inside chat */
[data-testid="stChatMessage"] code {
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.75rem !important;
    background: #13131a !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 4px !important;
    padding: 1px 5px !important;
    color: #c8c0a8 !important;
}
[data-testid="stChatMessage"] pre {
    background: #0a0a0c !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 8px !important;
    padding: 14px 16px !important;
    margin: 8px 0 0 !important;
    overflow-x: auto !important;
}
[data-testid="stChatMessage"] pre code {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    color: #a8b0c8 !important;
    font-size: 0.77rem !important;
    line-height: 1.7 !important;
}

/* Chat input */
[data-testid="stChatInput"] {
    background: #0c0c0e !important;
    border-top: 1px solid #1c1c22 !important;
    padding: 14px 32px 18px !important;
}
[data-testid="stChatInput"] > div {
    background: #13131a !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 8px !important;
    transition: border-color 0.15s !important;
}
[data-testid="stChatInput"] > div:focus-within {
    border-color: #2c2c3a !important;
}
[data-testid="stChatInput"] textarea {
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.8rem !important;
    color: #c8c8cc !important;
    background: transparent !important;
    line-height: 1.6 !important;
}
[data-testid="stChatInput"] textarea::placeholder {
    color: #33333e !important;
}
[data-testid="stChatInput"] button {
    background: #1c1c28 !important;
    border: 1px solid #2c2c38 !important;
    border-radius: 6px !important;
    color: #8888a0 !important;
    transition: all 0.15s !important;
}
[data-testid="stChatInput"] button:hover {
    background: #c8c0a8 !important;
    color: #0c0c0e !important;
    border-color: #c8c0a8 !important;
}

/* Expander (agent results) */
.streamlit-expanderHeader {
    background: #0e0e12 !important;
    border: 1px solid #1c1c22 !important;
    border-radius: 6px !important;
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.73rem !important;
    color: #8888a0 !important;
    padding: 8px 12px !important;
}
.streamlit-expanderHeader:hover {
    background: #13131a !important;
    color: #c8c8cc !important;
}
.streamlit-expanderContent {
    background: #0a0a0c !important;
    border: 1px solid #1c1c22 !important;
    border-top: none !important;
    border-radius: 0 0 6px 6px !important;
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.75rem !important;
    color: #8888a0 !important;
    padding: 10px 12px !important;
}

/* Spinner */
.stSpinner > div {
    border-top-color: #c8c0a8 !important;
}

/* Caption */
.stCaption {
    font-family: 'IBM Plex Mono', monospace !important;
    font-size: 0.68rem !important;
    color: #33333e !important;
}

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1c1c22; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #2c2c38; }
</style>
""", unsafe_allow_html=True)

# ── Sidebar ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### devpilot")
    st.caption("multi-agent · rag · streaming")
    st.divider()

    mode = st.radio(
        "mode",
        ["ask (rag)", "agent run", "manage repos"],
    )

    st.divider()

    if mode == "manage repos":
        st.markdown("**local repo**")
        repo_path = st.text_input("path", placeholder="/Users/you/project")

        c1, c2 = st.columns(2)
        with c1:
            if st.button("index"):
                with st.spinner("indexing..."):
                    try:
                        res = requests.post(f"{API_BASE}/upload-repo", json={"path": repo_path})
                        data = res.json()
                        st.success(f"{data.get('chunks_added', 0)} chunks")
                    except Exception:
                        st.error("backend offline")
        with c2:
            if st.button("reset"):
                for f in ["faiss_index.index", "faiss_index.pkl"]:
                    p = os.path.join(os.path.dirname(__file__), f)
                    if os.path.exists(p):
                        os.remove(p)
                with st.spinner("reindexing..."):
                    try:
                        res = requests.post(f"{API_BASE}/upload-repo", json={"path": repo_path})
                        data = res.json()
                        st.success(f"{data.get('chunks_added', 0)} chunks")
                    except Exception:
                        st.error("backend offline")

        st.divider()
        st.markdown("**github repo**")
        github_url = st.text_input("url", placeholder="https://github.com/user/repo")
        if st.button("clone & index"):
            with st.spinner("cloning..."):
                try:
                    res = requests.post(f"{API_BASE}/upload-github", json={"url": github_url})
                    data = res.json()
                    if "error" in data:
                        st.error(data["error"])
                    else:
                        st.success(f"{data.get('chunks_added', 0)} chunks")
                except Exception:
                    st.error("backend offline")

        st.divider()
        st.markdown("**switch repo**")
        try:
            repos = requests.get(f"{API_BASE}/repos", timeout=2).json()
            if repos:
                selected = st.selectbox("active", list(repos.keys()))
                if st.button("switch"):
                    with st.spinner(f"loading {selected}..."):
                        res = requests.post(
                            f"{API_BASE}/repos/switch",
                            json={"path": repos[selected]}
                        )
                        data = res.json()
                        st.success(f"{data.get('chunks_added', 0)} chunks loaded")
            else:
                st.info("no repos indexed yet")
        except Exception:
            st.caption("⬡ backend offline")

    st.divider()
    st.caption("endpoints")
    st.code(
        "POST /ask/stream\nPOST /agent/run/stream\nPOST /upload-github\nGET  /repos",
        language="bash"
    )

# ── Header ────────────────────────────────────────────────────────────────────
mode_label = {
    "ask (rag)": "ask · rag retrieval",
    "agent run": "agent · multi-agent orchestration",
    "manage repos": "repos · index & manage",
}
st.markdown(
    f"""<div class="main-header">
        <span style="font-family:'Instrument Serif',serif;font-style:italic;font-size:1.15rem;color:#f0f0f2;">devpilot</span>
        <span style="font-size:0.68rem;color:#33333e;letter-spacing:0.08em;text-transform:uppercase;">{mode_label.get(mode,'')}</span>
    </div>""",
    unsafe_allow_html=True,
)

# ── Chat state ────────────────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []

if not st.session_state.messages:
    st.markdown(
        """<div style="padding:60px 32px;color:#22222a;font-size:0.75rem;line-height:2;">
            ⬡ &nbsp; index a repository, then ask anything about your code.<br>
            ⬡ &nbsp; use agent mode for multi-step reasoning across your codebase.
        </div>""",
        unsafe_allow_html=True,
    )

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# ── Input ─────────────────────────────────────────────────────────────────────
prompt = st.chat_input("ask anything about your codebase...")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # ASK / RAG mode
    if mode == "ask (rag)":
        with st.chat_message("assistant"):
            placeholder = st.empty()
            full_response = ""
            try:
                with requests.post(
                    f"{API_BASE}/ask/stream",
                    json={"prompt": prompt},
                    stream=True,
                    timeout=60,
                ) as r:
                    for line in r.iter_lines():
                        if line:
                            decoded = line.decode("utf-8")
                            if decoded.startswith("data: "):
                                token = decoded[6:]
                                if token == "[DONE]":
                                    break
                                full_response += token
                                placeholder.markdown(full_response + "▌")
                placeholder.markdown(full_response)
            except Exception as e:
                full_response = f"_backend error: {e}_"
                placeholder.markdown(full_response)
            st.session_state.messages.append({"role": "assistant", "content": full_response})

    # AGENT mode
    elif mode == "agent run":
        with st.chat_message("assistant"):
            st.caption("orchestrating agents...")
            agent_results = []
            try:
                with requests.post(
                    f"{API_BASE}/agent/run/stream",
                    json={"query": prompt},
                    stream=True,
                    timeout=120,
                ) as r:
                    for line in r.iter_lines():
                        if line:
                            decoded = line.decode("utf-8")
                            if decoded.startswith("data: "):
                                token = decoded[6:]
                                if token == "[DONE]":
                                    break
                                try:
                                    data = json.loads(token)
                                    agent_results.append(data)
                                    icon = "·" if data["status"] == "success" else "✕"
                                    with st.expander(
                                        f"{icon}  {data['agent'].lower()}  —  {data['status']}",
                                        expanded=(data["status"] != "success"),
                                    ):
                                        st.markdown(data["output"])
                                except Exception:
                                    pass
            except Exception as e:
                st.caption(f"backend error: {e}")

            if agent_results:
                final = agent_results[-1]["output"]
                st.divider()
                st.markdown(final)
                st.session_state.messages.append({"role": "assistant", "content": final})