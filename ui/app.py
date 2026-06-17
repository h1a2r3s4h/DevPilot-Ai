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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fira+Code:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
    --bg:         #04040a;
    --bg-1:       #080810;
    --bg-2:       #0e0e1a;
    --bg-3:       #141424;
    --border:     rgba(255,255,255,0.055);
    --border-hi:  rgba(255,255,255,0.11);
    --text:       #cdd0e0;
    --text-dim:   #525570;
    --text-mute:  #22222f;
    --gold:       #f0d080;
    --gold-dim:   #7a6530;
    --teal:       #60eedd;
    --red:        #ff7070;
    --purple:     #b09fff;
    --grid-color: rgba(255,255,255,0.022);
    --radius:     10px;
    --radius-lg:  14px;
}

html, body, [class*="css"] {
    font-family: 'Fira Code', monospace;
    background: var(--bg);
    color: var(--text);
}

body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        linear-gradient(var(--grid-color) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
}

#MainMenu, footer, header { visibility: hidden; }
.block-container { padding: 0 !important; max-width: 100% !important; position: relative; z-index: 1; }

/* ─── SIDEBAR ─────────────────────────────────────────────────── */
[data-testid="stSidebar"] {
    background: var(--bg-1) !important;
    border-right: 1px solid var(--border) !important;
    padding: 0 !important;
}
[data-testid="stSidebar"] > div:first-child {
    padding: 30px 20px 24px !important;
}
[data-testid="stSidebar"] * {
    font-family: 'Fira Code', monospace !important;
}

.logo-wrap {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 4px;
}
.logo-hex {
    width: 34px;
    height: 34px;
    background: linear-gradient(140deg, var(--gold) 0%, #c4882a 100%);
    clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    color: #1a1000;
    font-weight: 700;
    flex-shrink: 0;
    animation: hex-pulse 5s ease-in-out infinite;
}
@keyframes hex-pulse {
    0%,100% { filter: drop-shadow(0 0 6px rgba(240,208,128,0.25)); }
    50%      { filter: drop-shadow(0 0 18px rgba(240,208,128,0.5)); }
}
.logo-text {
    font-family: 'Outfit', sans-serif !important;
    font-weight: 800 !important;
    font-size: 1.2rem !important;
    color: #eeeef8 !important;
    letter-spacing: -0.04em !important;
}
.logo-sub {
    font-size: 0.56rem !important;
    color: var(--text-dim) !important;
    letter-spacing: 0.16em !important;
    text-transform: uppercase !important;
    margin-left: 45px;
    margin-top: -3px;
    margin-bottom: 18px;
    opacity: 0.7;
}

[data-testid="stSidebar"] hr {
    border: none !important;
    border-top: 1px solid var(--border) !important;
    margin: 18px 0 !important;
}

[data-testid="stSidebar"] .stRadio > label {
    font-size: 0.56rem !important;
    color: var(--text-dim) !important;
    letter-spacing: 0.15em !important;
    text-transform: uppercase !important;
    margin-bottom: 8px !important;
}
[data-testid="stSidebar"] .stRadio div[role="radiogroup"] {
    gap: 2px !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"] {
    background: transparent !important;
    padding: 9px 12px !important;
    border-radius: var(--radius) !important;
    border: 1px solid transparent !important;
    transition: all 0.18s ease !important;
    cursor: pointer !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"]:hover {
    background: var(--bg-2) !important;
    border-color: var(--border-hi) !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"] p {
    font-size: 0.7rem !important;
    color: var(--text-dim) !important;
    letter-spacing: 0.02em !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"][aria-checked="true"] {
    background: linear-gradient(135deg, rgba(240,208,128,0.08) 0%, rgba(14,14,26,0.9) 100%) !important;
    border-color: rgba(240,208,128,0.25) !important;
    box-shadow: 0 0 0 1px rgba(240,208,128,0.08), inset 0 1px 0 rgba(255,255,255,0.04) !important;
}
[data-testid="stSidebar"] .stRadio label[data-baseweb="radio"][aria-checked="true"] p {
    color: var(--gold) !important;
}
[data-testid="stSidebar"] .stRadio span[data-baseweb="radio"] {
    display: none !important;
}

[data-testid="stSidebar"] .stTextInput > div > div > input {
    font-family: 'Fira Code', monospace !important;
    font-size: 0.68rem !important;
    background: var(--bg-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    color: var(--text) !important;
    padding: 9px 12px !important;
    transition: all 0.2s ease !important;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.4) !important;
}
[data-testid="stSidebar"] .stTextInput > div > div > input:focus {
    border-color: rgba(240,208,128,0.35) !important;
    box-shadow: 0 0 0 3px rgba(240,208,128,0.06), inset 0 1px 3px rgba(0,0,0,0.4) !important;
    outline: none !important;
}
[data-testid="stSidebar"] .stTextInput label {
    font-size: 0.57rem !important;
    color: var(--text-dim) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.12em !important;
    margin-bottom: 5px !important;
}

[data-testid="stSidebar"] .stButton > button {
    font-family: 'Fira Code', monospace !important;
    font-size: 0.66rem !important;
    font-weight: 500 !important;
    background: var(--bg-2) !important;
    color: var(--text-dim) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    padding: 7px 10px !important;
    width: 100% !important;
    transition: all 0.18s ease !important;
    letter-spacing: 0.04em !important;
    box-shadow: 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03) !important;
}
[data-testid="stSidebar"] .stButton > button:hover {
    background: var(--bg-3) !important;
    color: var(--gold) !important;
    border-color: rgba(240,208,128,0.3) !important;
    box-shadow: 0 4px 16px rgba(240,208,128,0.1), inset 0 1px 0 rgba(255,255,255,0.05) !important;
    transform: translateY(-1px) !important;
}
[data-testid="stSidebar"] .stButton > button:active {
    transform: translateY(0) !important;
}

[data-testid="stSidebar"] .stSelectbox > div > div {
    background: var(--bg-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    font-size: 0.68rem !important;
    color: var(--text) !important;
}

.stSuccess {
    background: rgba(96,238,221,0.05) !important;
    border: 1px solid rgba(96,238,221,0.2) !important;
    border-radius: var(--radius) !important;
    font-family: 'Fira Code', monospace !important;
    font-size: 0.68rem !important;
    color: var(--teal) !important;
}
.stError {
    background: rgba(255,112,112,0.05) !important;
    border: 1px solid rgba(255,112,112,0.2) !important;
    border-radius: var(--radius) !important;
    font-family: 'Fira Code', monospace !important;
    font-size: 0.68rem !important;
}
.stInfo {
    background: rgba(176,159,255,0.05) !important;
    border: 1px solid rgba(176,159,255,0.2) !important;
    border-radius: var(--radius) !important;
    font-family: 'Fira Code', monospace !important;
    font-size: 0.68rem !important;
}

[data-testid="stSidebar"] code {
    font-family: 'Fira Code', monospace !important;
    font-size: 0.6rem !important;
    background: var(--bg) !important;
    border: 1px solid var(--border) !important;
    border-radius: 8px !important;
    line-height: 2 !important;
    color: #7a8aaa !important;
    padding: 10px 14px !important;
    display: block !important;
}


/* ─── MAIN HEADER ─────────────────────────────────────────────── */
.main-header {
    padding: 18px 36px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 14px;
    background: linear-gradient(180deg, rgba(8,8,16,0.98) 0%, rgba(4,4,10,0.95) 100%);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}
.main-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(240,208,128,0.15), transparent);
}
.header-badge {
    font-family: 'Fira Code', monospace;
    font-size: 0.56rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #1a1000;
    background: linear-gradient(135deg, var(--gold), #c4882a);
    padding: 3px 10px;
    border-radius: 100px;
    font-weight: 600;
    box-shadow: 0 2px 10px rgba(240,208,128,0.2);
}
.header-mode {
    font-size: 0.62rem;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    text-transform: uppercase;
}
.header-title {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1rem;
    color: #eeeef8;
    letter-spacing: -0.04em;
}


/* ─── EMPTY STATE ─────────────────────────────────────────────── */
.empty-state {
    padding: 72px 40px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: relative;
}
.empty-state::before {
    content: '';
    position: absolute;
    top: 40px;
    left: 0;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(240,208,128,0.04) 0%, transparent 70%);
    pointer-events: none;
}
.empty-title {
    font-family: 'Outfit', sans-serif;
    font-size: 2.4rem;
    font-weight: 800;
    color: rgba(255,255,255,0.06);
    letter-spacing: -0.05em;
    margin-bottom: 28px;
    line-height: 1.1;
}
.empty-title span { color: rgba(240,208,128,0.5); }
.empty-hint {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-mute);
    font-size: 0.7rem;
    letter-spacing: 0.02em;
    padding: 2px 0;
}
.empty-hint .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--gold-dim);
    flex-shrink: 0;
    opacity: 0.6;
}


/* ─── CHAT MESSAGES ───────────────────────────────────────────── */
[data-testid="stChatMessage"] {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 18px 36px !important;
    margin: 0 !important;
    border-bottom: 1px solid var(--border) !important;
    font-family: 'Fira Code', monospace !important;
    transition: background 0.15s ease !important;
    animation: fadeIn 0.2s ease forwards !important;
}
[data-testid="stChatMessage"]:hover {
    background: rgba(14,14,26,0.5) !important;
}
[data-testid="stChatMessage"] p {
    font-size: 0.79rem !important;
    line-height: 1.9 !important;
    color: var(--text) !important;
    margin: 0 !important;
}
[data-testid="stChatMessage"][data-testid*="user"] {
    background: rgba(240,208,128,0.018) !important;
}

[data-testid="stChatMessage"] [data-testid="chatAvatarIcon-user"],
[data-testid="stChatMessage"] [data-testid="chatAvatarIcon-assistant"] {
    background: var(--bg-3) !important;
    border: 1px solid var(--border-hi) !important;
    border-radius: 8px !important;
    width: 28px !important;
    height: 28px !important;
    font-size: 0.58rem !important;
    color: var(--gold) !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
}

[data-testid="stChatMessage"] code {
    font-family: 'Fira Code', monospace !important;
    font-size: 0.72rem !important;
    background: rgba(240,208,128,0.07) !important;
    border: 1px solid rgba(240,208,128,0.12) !important;
    border-radius: 5px !important;
    padding: 2px 7px !important;
    color: var(--gold) !important;
}
[data-testid="stChatMessage"] pre {
    background: var(--bg-1) !important;
    border: 1px solid var(--border) !important;
    border-left: 2px solid var(--gold-dim) !important;
    border-radius: var(--radius) !important;
    padding: 16px 20px !important;
    margin: 12px 0 !important;
    overflow-x: auto !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
    position: relative;
}
[data-testid="stChatMessage"] pre::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(240,208,128,0.12), transparent);
}
[data-testid="stChatMessage"] pre code {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    color: #a8b8d0 !important;
    font-size: 0.74rem !important;
    line-height: 1.75 !important;
}


/* ─── CHAT INPUT ──────────────────────────────────────────────── */
[data-testid="stChatInput"] {
    background: linear-gradient(0deg, rgba(4,4,10,0.98) 0%, rgba(4,4,10,0.9) 100%) !important;
    border-top: 1px solid var(--border) !important;
    padding: 14px 36px 18px !important;
}
[data-testid="stChatInput"] > div {
    background: var(--bg-2) !important;
    border: 1px solid var(--border-hi) !important;
    border-radius: var(--radius-lg) !important;
    transition: all 0.22s ease !important;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03) !important;
}
[data-testid="stChatInput"] > div:focus-within {
    border-color: rgba(240,208,128,0.3) !important;
    box-shadow: 0 0 0 3px rgba(240,208,128,0.06), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04) !important;
}
[data-testid="stChatInput"] textarea {
    font-family: 'Fira Code', monospace !important;
    font-size: 0.76rem !important;
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
    transition: all 0.18s ease !important;
}
[data-testid="stChatInput"] button:hover {
    background: linear-gradient(135deg, var(--gold), #c4882a) !important;
    color: #1a1000 !important;
    border-color: var(--gold) !important;
    box-shadow: 0 4px 18px rgba(240,208,128,0.3) !important;
    transform: scale(1.05) !important;
}


/* ─── EXPANDER ────────────────────────────────────────────────── */
.streamlit-expanderHeader {
    background: var(--bg-2) !important;
    border: 1px solid var(--border) !important;
    border-radius: var(--radius) !important;
    font-family: 'Fira Code', monospace !important;
    font-size: 0.68rem !important;
    color: var(--text-dim) !important;
    padding: 10px 14px !important;
    transition: all 0.15s ease !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.03) !important;
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
    border-radius: 0 0 var(--radius) var(--radius) !important;
    font-family: 'Fira Code', monospace !important;
    font-size: 0.7rem !important;
    color: var(--text-dim) !important;
    padding: 12px 14px !important;
}

/* ─── MISC ────────────────────────────────────────────────────── */
.stSpinner > div {
    border-top-color: var(--gold) !important;
    border-right-color: transparent !important;
    border-bottom-color: transparent !important;
    border-left-color: transparent !important;
}
.stCaption {
    font-family: 'Fira Code', monospace !important;
    font-size: 0.63rem !important;
    color: var(--text-dim) !important;
    letter-spacing: 0.04em !important;
}
hr {
    border: none !important;
    border-top: 1px solid var(--border) !important;
}

/* ─── SCROLLBAR ───────────────────────────────────────────────── */
::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: var(--gold-dim); }

/* ─── ANIMATIONS ──────────────────────────────────────────────── */
@keyframes blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0; }
}
.cursor { animation: blink 1s step-end infinite; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
}
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
        <span class="header-title">DevPilot</span>
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