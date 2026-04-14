from crewai import Task


def create_planning_task(agent, user_query):
    return Task(
        description=(
            f"Understand the request and use the knowledge base if needed.\n"
            f"User request: {user_query}"
        ),
        expected_output="Step-by-step plan with context awareness",
        agent=agent,
    )

def create_coding_task(agent, plan):
    return Task(
        description=(
            f"Write code based on this plan. Use knowledge base if needed.\n"
            f"{plan}"
        ),
        expected_output="Production-ready code",
        agent=agent,
    )

def create_debugging_task(agent, code):
    return Task(
        description=(
            f"Fix and improve this code using best practices.\n{code}"
        ),
        expected_output="Bug-free optimized code",
        agent=agent,
    )