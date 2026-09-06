from crewai import Task

# CrewAI Task Factory Functions
# In CrewAI, a Task is like a specific job assigned to a worker (Agent).
# Think of this like creating step objects in a Node.js workflow or async pipeline.

# 1. Planning Task: Analyzes the user's request and creates a step-by-step implementation plan
def create_planning_task(agent, user_query):
    return Task(
        description=(
            f"Understand the request and use the knowledge base if needed.\n"
            f"User request: {user_query}"
        ),
        expected_output="Step-by-step plan with context awareness",
        agent=agent,
    )

# 2. Coding Task: Takes the plan from the planner and generates/writes the actual code
def create_coding_task(agent, plan):
    return Task(
        description=(
            f"Write code based on this plan. Use knowledge base if needed.\n"
            f"{plan}"
        ),
        expected_output="Production-ready code",
        agent=agent,
    )

# 3. Debugging Task: Takes existing/generated code, reviews it for errors, and fixes bugs
def create_debugging_task(agent, code):
    return Task(
        description=(
            f"Fix and improve this code using best practices.\n{code}"
        ),
        expected_output="Bug-free optimized code",
        agent=agent,
    )