from app.agents.orchestrator import run_multi_agent_system

response = run_multi_agent_system("Build a simple FastAPI endpoint")

print("\nFINAL OUTPUT:\n", response)