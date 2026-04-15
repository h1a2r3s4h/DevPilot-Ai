import streamlit as st
import requests
import json
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

API_BASE = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="DevPilot",
    page_icon="◈",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
    --bg:        #060608;
    --bg-1:      #0b0b0f;
    --bg-2:      #111118;
    --bg-3:      #18181f;
    --border:    #1f1f2e;
    --border-hi: #2e2e45;
    --text:      #d4d4e0;
    --text-dim:  #5a5a78;
    --text-mute: #2a2a38;
    --gold:      #e2c97e;
    --gold-dim:  #8a7a4a;
    --teal:      #5ee8c8;
    --teal-dim:  #1a5e50;
    --red:       #ff6b6b;
    --purple:    #a78bfa;
}

html, body, [class*="css"] {
    font-family: 'JetBrains Mono', monospace;
    background: var(--bg);
    color: var(--text);
}

#MainMenu, footer, header { visibility: hidden; }
.block-container { padding: 0 !important; max-width: 100% !important; }

/* ─── SIDEBAR ─────────────────────────────────────────────────── */
[data-testid="stSidebar"] {
    background: var(--bg-1) !important;
    border-right: 1px solid var(--border) !important;
    padding: 0 !important;
}
[data-testid="stSidebar"] > div:first-child {
    padding: 32px 22px 24px !important;
}
[data-testid="stSidebar"] * {
    font-family: 'JetBrains Mono', monospace !important;
}

/* Logo block */
.logo-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
}
.logo-hex {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, var(--gold) 0%, #b8943a 100%);
    clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    color: var(--bg);
    font-weight: 700;
    letter-spacing: 0;
    flex-shrink: 0;
    animation: pulse-hex 4s ease-in-out infinite;
}
@keyframes pulse-hex {
    0%,100% { box-shadow: 0 0 0 0 rgba(226,201,126,0); }
    50%      { box-shadow: 0 0 18px 4px rgba(226,201,126,0.18); }
}
.logo-text {
    font-family: 'Syne', sans-serif !important;
    font-weight: 800 !important;
    font-size: 1.25rem !important;
    color: #f4f4f8 !important;
    letter-spacing: -0.03em !important;
}
.logo-sub {
    font-size: 0.58rem !important;
    color: var(--text-dim) !important;
    letter-spacing: 0.14em !important;
    text-transform: uppercase !important;
    margin-left: 48px;
    margin-top: -2px;
    margin-bottom: 20px;
}

/* Mode nav radio */
[data-testid="stSidebar"] .stRadio > label {
    font-size: 0.6rem !important;
    color: var(--text-mute) !important;
    letter-spacing: 0.14em !important;
    text-transform: uppercase !important;
    margin-bottom: 10px !important;
}
[data-testid="stSidebar"] .stRadio div[role="radiogroup"] {
    gap: 3px !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"] {
    background: transparent !important;
    padding: 10px 12px !important;
    border-radius: 8px !important;
    border: 1px solid transparent !important;
    transition: all 0.2s !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"]:hover {
    background: var(--bg-2) !important;
    border-color: var(--border) !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"] p {
    font-size: 0.72rem !important;
    color: var(--text-dim) !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"][aria-checked="true"] {
    background: var(--bg-3) !important;
    border-color: var(--gold-dim) !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"][aria-checked="true"] p {
    color: var(--gold) !important;
}

/* Hide default radio dot */
[data-testid="stSidebar"] .stRadio span[data-baseweb="radio"] {
    display: none !important;
}

[data-testid="stSidebar"] hr {
    border-color: var(--border) !important;
    margin: 20px 0 !important;
}

/* Sidebar text inputs */
[data-testid="stSidebar"] .stTextInput > div > div > input {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.7rem !important;
    background: var(--bg-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    color: var(--text) !important;
    padding: 10px 12px !important;
    transition: all 0.2s !important;
}
[data-testid="stSidebar"] .stTextInput > div > div > input:focus {
    border-color: var(--gold-dim) !important;
    box-shadow: 0 0 0 3px rgba(226,201,126,0.07) !important;
}
[data-testid="stSidebar"] .stTextInput label {
    font-size: 0.6rem !important;
    color: var(--text-dim) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.1em !important;
    margin-bottom: 4px !important;
}

/* Sidebar buttons */
[data-testid="stSidebar"] .stButton > button {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.68rem !important;
    font-weight: 500 !important;
    background: var(--bg-2) !important;
    color: var(--text-dim) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    padding: 8px 10px !important;
    width: 100% !important;
    transition: all 0.2s !important;
    letter-spacing: 0.05em !important;
}
[data-testid="stSidebar"] .stButton > button:hover {
    background: var(--bg-3) !important;
    color: var(--gold) !important;
    border-color: var(--gold-dim) !important;
    box-shadow: 0 2px 12px rgba(226,201,126,0.1) !important;
}

/* Selectbox */
[data-testid="stSidebar"] .stSelectbox > div > div {
    background: var(--bg-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    font-size: 0.7rem !important;
    color: var(--text) !important;
}

/* Alerts */
.stSuccess {
    background: rgba(94,232,200,0.05) !important;
    border: 1px solid var(--teal-dim) !important;
    border-radius: 8px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.7rem !important;
    color: var(--teal) !important;
}
.stError {
    background: rgba(255,107,107,0.05) !important;
    border: 1px solid #5a2020 !important;
    border-radius: 8px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.7rem !important;
}
.stInfo {
    background: rgba(167,139,250,0.05) !important;
    border: 1px solid #3a2e5a !important;
    border-radius: 8px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.7rem !important;
}

/* Endpoint code block */
[data-testid="stSidebar"] .stCode {
    font-size: 0.62rem !important;
}
[data-testid="stSidebar"] code {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.62rem !important;
    background: var(--bg) !important;
    border: 1px solid var(--border) !important;
    border-radius: 6px !important;
    line-height: 1.9 !important;
    color: var(--text-dim) !important;
}


/* ─── MAIN HEADER ─────────────────────────────────────────────── */
.main-header {
    padding: 20px 36px 18px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
    background: linear-gradient(180deg, #0b0b10 0%, var(--bg) 100%);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
}
.header-badge {
    font-size: 0.6rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--bg);
    background: var(--gold);
    padding: 3px 9px;
    border-radius: 100px;
    font-weight: 600;
}
.header-mode {
    font-size: 0.65rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    text-transform: uppercase;
}


/* ─── EMPTY STATE ─────────────────────────────────────────────── */
.empty-state {
    padding: 80px 36px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.empty-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-mute);
    font-size: 0.72rem;
    transition: color 0.2s;
}
.empty-hint .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--gold-dim);
    flex-shrink: 0;
}
.empty-title {
    font-family: 'Syne', sans-serif;
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-mute);
    letter-spacing: -0.04em;
    margin-bottom: 24px;
    line-height: 1.1;
}
.empty-title span {
    color: var(--gold);
}


/* ─── CHAT MESSAGES ───────────────────────────────────────────── */
[data-testid="stChatMessage"] {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 20px 36px !important;
    margin: 0 !important;
    border-bottom: 1px solid var(--bg-2) !important;
    font-family: 'JetBrains Mono', monospace !important;
    transition: background 0.15s !important;
}
[data-testid="stChatMessage"]:hover {
    background: rgba(11,11,15,0.6) !important;
}
[data-testid="stChatMessage"] p {
    font-size: 0.8rem !important;
    line-height: 1.85 !important;
    color: var(--text) !important;
    margin: 0 !important;
}

/* User bubble */
[data-testid="stChatMessage"][data-testid*="user"] {
    background: var(--bg-1) !important;
}

/* Avatar */
[data-testid="stChatMessage"] [data-testid="chatAvatarIcon-user"],
[data-testid="stChatMessage"] [data-testid="chatAvatarIcon-assistant"] {
    background: var(--bg-3) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    width: 30px !important;
    height: 30px !important;
    font-size: 0.6rem !important;
    color: var(--gold) !important;
}

/* Code inside chat */
[data-testid="stChatMessage"] code {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.73rem !important;
    background: var(--bg-3) !important;
    border: 1px solid var(--border) !important;
    border-radius: 5px !important;
    padding: 2px 6px !important;
    color: var(--gold) !important;
}
[data-testid="stChatMessage"] pre {
    background: var(--bg-1) !important;
    border: 1px solid var(--border) !important;
    border-left: 3px solid var(--gold-dim) !important;
    border-radius: 8px !important;
    padding: 16px 18px !important;
    margin: 10px 0 !important;
    overflow-x: auto !important;
    position: relative;
}
[data-testid="stChatMessage"] pre code {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    color: #b0c0e0 !important;
    font-size: 0.75rem !important;
    line-height: 1.75 !important;
}


/* ─── CHAT INPUT ──────────────────────────────────────────────── */
[data-testid="stChatInput"] {
    background: var(--bg) !important;
    border-top: 1px solid var(--border) !important;
    padding: 16px 36px 20px !important;
}
[data-testid="stChatInput"] > div {
    background: var(--bg-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: 12px !important;
    transition: all 0.2s !important;
}
[data-testid="stChatInput"] > div:focus-within {
    border-color: var(--gold-dim) !important;
    box-shadow: 0 0 0 3px rgba(226,201,126,0.07), 0 4px 24px rgba(0,0,0,0.3) !important;
}
[data-testid="stChatInput"] textarea {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.78rem !important;
    color: var(--text) !important;
    background: transparent !important;
    line-height: 1.7 !important;
}
[data-testid="stChatInput"] textarea::placeholder {
    color: var(--text-mute) !important;
}
[data-testid="stChatInput"] button {
    background: var(--bg-3) !important;
    border: 1px solid var(--border-hi) !important;
    border-radius: 8px !important;
    color: var(--gold-dim) !important;
    transition: all 0.2s !important;
}
[data-testid="stChatInput"] button:hover {
    background: var(--gold) !important;
    color: var(--bg) !important;
    border-color: var(--gold) !important;
    box-shadow: 0 2px 16px rgba(226,201,126,0.25) !important;
}


/* ─── EXPANDER (agent) ────────────────────────────────────────── */
.streamlit-expanderHeader {
    background: var(--bg-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.7rem !important;
    color: var(--text-dim) !important;
    padding: 10px 14px !important;
    transition: all 0.15s !important;
}
.streamlit-expanderHeader:hover {
    background: var(--bg-3) !important;
    border-color: var(--border-hi) !important;
    color: var(--text) !important;
}
.streamlit-expanderContent {
    background: var(--bg-1) !important;
    border: 1px solid var(--border) !important;
    border-top: none !important;
    border-radius: 0 0 8px 8px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.72rem !important;
    color: var(--text-dim) !important;
    padding: 12px 14px !important;
}


/* ─── SPINNER ─────────────────────────────────────────────────── */
.stSpinner > div {
    border-top-color: var(--gold) !important;
}

/* ─── CAPTION ─────────────────────────────────────────────────── */
.stCaption {
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.65rem !important;
    color: var(--text-mute) !important;
}

/* ─── SCROLLBAR ───────────────────────────────────────────────── */
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--gold-dim); }

/* Typing cursor animation */
@keyframes blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0; }
}
.cursor { animation: blink 1s step-end infinite; }
</style>
""", unsafe_allow_html=True)


# ─── SIDEBAR ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div class="logo-wrap">
        <div class="logo-hex">◈</div>
        <div class="logo-text">DevPilot</div>
    </div>
    <div class="logo-sub">Multi-Agent · RAG · Streaming</div>
    """, unsafe_allow_html=True)

    st.divider()

    mode = st.radio(
        "Navigation",
        ["ask (rag)", "agent run", "manage repos"],
        label_visibility="collapsed",
    )

    st.divider()

    if mode == "manage repos":
        st.markdown(
            '<p style="font-size:0.6rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Local Repository</p>',
            unsafe_allow_html=True
        )
        repo_path = st.text_input("Path", placeholder="/Users/you/project", label_visibility="collapsed")

        c1, c2 = st.columns(2)
        with c1:
            if st.button("⊕ Index"):
                with st.spinner("indexing..."):
                    try:
                        res = requests.post(f"{API_BASE}/upload-repo", json={"path": repo_path})
                        data = res.json()
                        st.success(f"✓ {data.get('chunks_added', 0)} chunks")
                    except Exception:
                        st.error("backend offline")
        with c2:
            if st.button("↺ Reset"):
                for f in ["faiss_index.index", "faiss_index.pkl"]:
                    p = os.path.join(os.path.dirname(__file__), f)
                    if os.path.exists(p):
                        os.remove(p)
                with st.spinner("reindexing..."):
                    try:
                        res = requests.post(f"{API_BASE}/upload-repo", json={"path": repo_path})
                        data = res.json()
                        st.success(f"✓ {data.get('chunks_added', 0)} chunks")
                    except Exception:
                        st.error("backend offline")

        st.divider()

        st.markdown(
            '<p style="font-size:0.6rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">GitHub Repository</p>',
            unsafe_allow_html=True
        )
        github_url = st.text_input("URL", placeholder="https://github.com/user/repo", label_visibility="collapsed")
        if st.button("⬇ Clone & Index"):
            with st.spinner("cloning..."):
                try:
                    res = requests.post(f"{API_BASE}/upload-github", json={"url": github_url})
                    data = res.json()
                    if "error" in data:
                        st.error(data["error"])
                    else:
                        st.success(f"✓ {data.get('chunks_added', 0)} chunks")
                except Exception:
                    st.error("backend offline")

        st.divider()

        st.markdown(
            '<p style="font-size:0.6rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Switch Active Repo</p>',
            unsafe_allow_html=True
        )
        try:
            repos = requests.get(f"{API_BASE}/repos", timeout=2).json()
            if repos:
                selected = st.selectbox("Active", list(repos.keys()), label_visibility="collapsed")
                if st.button("⇄ Switch"):
                    with st.spinner(f"loading {selected}..."):
                        res = requests.post(f"{API_BASE}/repos/switch", json={"path": repos[selected]})
                        data = res.json()
                        st.success(f"✓ {data.get('chunks_added', 0)} chunks loaded")
            else:
                st.info("no repos indexed yet")
        except Exception:
            st.caption("◈ backend offline")

    st.divider()

    st.markdown(
        '<p style="font-size:0.6rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">API Endpoints</p>',
        unsafe_allow_html=True
    )
    st.code(
        "POST /ask/stream\nPOST /agent/run/stream\nPOST /upload-github\nGET  /repos",
        language="bash"
    )


# ─── HEADER ───────────────────────────────────────────────────────────────────
mode_meta = {
    "ask (rag)":    ("ASK",   "rag retrieval mode"),
    "agent run":    ("AGENT", "multi-agent orchestration"),
    "manage repos": ("REPOS", "index & manage codebases"),
}
badge, subtitle = mode_meta.get(mode, ("", ""))

st.markdown(
    f"""
    <div class="main-header">
        <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.05rem;color:#f4f4f8;letter-spacing:-0.03em;">DevPilot</span>
        <span class="header-badge">{badge}</span>
        <span class="header-mode">{subtitle}</span>
    </div>
    """,
    unsafe_allow_html=True,
)


# ─── CHAT STATE ───────────────────────────────────────────────────────────────
if "messages" not in st.session_state:
    st.session_state.messages = []

if not st.session_state.messages:
    st.markdown(
        """
        <div class="empty-state">
            <div class="empty-title">Ask anything about<br><span>your code.</span></div>
            <div class="empty-hint"><div class="dot"></div>Index a local or GitHub repository to begin</div>
            <div class="empty-hint"><div class="dot"></div>RAG mode retrieves context from your codebase</div>
            <div class="empty-hint"><div class="dot"></div>Agent mode runs multi-step reasoning across files</div>
            <div class="empty-hint"><div class="dot"></div>Switch between repos anytime from the sidebar</div>
        </div>
        """,
        unsafe_allow_html=True,
    )

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])


# ─── INPUT ────────────────────────────────────────────────────────────────────
prompt = st.chat_input("Ask anything about your codebase…")

if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # ── ASK / RAG ──────────────────────────────────────────────────────────────
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

    # ── AGENT ──────────────────────────────────────────────────────────────────
    elif mode == "agent run":
        with st.chat_message("assistant"):
            st.caption("◈  orchestrating agents…")
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
                                    ok = data["status"] == "success"
                                    icon = "✓" if ok else "✕"
                                    with st.expander(
                                        f"{icon}  {data['agent'].lower()}  ·  {data['status']}",
                                        expanded=not ok,
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