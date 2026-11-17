import gradio as gr
from app.main import app

with gr.Blocks(title="DevPilot AI Backend") as demo:
    gr.Markdown("# ⚡ DevPilot AI Backend API is Live!")
    gr.Markdown("FastAPI Endpoints are active and ready for the React frontend.")
    gr.Markdown("👉 Visit [/docs](/docs) for the interactive Swagger API documentation.")

app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
