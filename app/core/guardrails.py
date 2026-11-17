import re
from typing import Optional, Tuple
from pydantic import BaseModel
from app.core.observability import log_tracker

class GuardrailCheckResult(BaseModel):
    is_safe: bool
    risk_level: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    reason: Optional[str] = None
    sanitized_text: Optional[str] = None

# Known prompt injection & jailbreak signature patterns
JAILBREAK_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"disregard\s+(all\s+)?(previous|prior)\s+(instructions|rules)",
    r"you\s+are\s+now\s+(in\s+)?(DAN|developer|jailbreak|unrestricted)\s+mode",
    r"bypass\s+(all\s+)?(content\s+filters|safeguards|rules|restrictions)",
    r"reveal\s+(the\s+)?(system\s+prompt|developer\s+instructions|secret\s+key)",
    r"print\s+(the\s+)?entire\s+(system\s+prompt|instructions)",
    r"act\s+as\s+an\s+unfiltered\s+AI",
    r"what\s+is\s+your\s+system\s+prompt",
]

# Destructive system commands that should never run in generated or executed scripts
DESTRUCTIVE_PATTERNS = [
    r"rm\s+(-rf|-fr|-r|-f)\s+(/|/\*|~|\$HOME)",
    r":\(\)\s*\{\s*:\|:&\s*\};:",  # Fork bomb
    r"mkfs(\.ext\d|\.vfat|\.ntfs)?\s+/dev/",
    r"dd\s+if=/dev/(zero|urandom)\s+of=/dev/",
    r"chmod\s+(-R\s+)?777\s+/",
    r"shutil\.rmtree\s*\(\s*['\"](/|/\*|~)",
    r"os\.system\s*\(\s*['\"]rm\s+-rf",
    r"curl\s+.*\|\s*(sh|bash)",
    r"wget\s+.*\|\s*(sh|bash)",
]

# High-risk secret patterns to prevent accidental leaks
SECRET_PATTERNS = [
    r"sk-[a-zA-Z0-9]{32,}",                # OpenAI / OpenRouter key pattern
    r"AKIA[0-9A-Z]{16}",                   # AWS Access Key
    r"-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----",
    r"(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}", # GitHub Token
]

class Guardrails:
    """Enterprise AI Guardrails Engine for DevPilot AI.
    
    Provides:
    - Prompt Injection & Jailbreak Detection
    - Destructive Execution Command Prevention
    - Secret & Sensitive Credential Leak Shielding
    """

    @staticmethod
    def inspect_prompt(prompt: str) -> GuardrailCheckResult:
        """Inspects incoming user prompt for jailbreak or injection patterns."""
        if not prompt or not prompt.strip():
            return GuardrailCheckResult(is_safe=True, risk_level="LOW")

        prompt_clean = prompt.strip()

        # Check for Jailbreak / Prompt Injection patterns
        for pattern in JAILBREAK_PATTERNS:
            if re.search(pattern, prompt_clean, re.IGNORECASE):
                log_tracker.add_event(
                    level="WARN",
                    component="GUARDRAIL",
                    message="Prompt injection / jailbreak attempt intercepted and blocked.",
                    details={"pattern": pattern, "snippet": prompt_clean[:120]}
                )
                return GuardrailCheckResult(
                    is_safe=False,
                    risk_level="HIGH",
                    reason="Security Violation: The prompt contains patterns resembling a prompt injection or system override attempt."
                )

        # Check for Destructive Shell Code in prompt
        for pattern in DESTRUCTIVE_PATTERNS:
            if re.search(pattern, prompt_clean, re.IGNORECASE):
                log_tracker.add_event(
                    level="ERROR",
                    component="GUARDRAIL",
                    message="Destructive system execution pattern intercepted and blocked.",
                    details={"pattern": pattern, "snippet": prompt_clean[:120]}
                )
                return GuardrailCheckResult(
                    is_safe=False,
                    risk_level="CRITICAL",
                    reason="Security Violation: The prompt contains destructive file-system or system-level command patterns."
                )

        return GuardrailCheckResult(is_safe=True, risk_level="LOW", sanitized_text=prompt_clean)

    @staticmethod
    def inspect_code_for_execution(code: str) -> Tuple[bool, Optional[str]]:
        """Inspects raw code payload prior to container or local execution."""
        if not code or not code.strip():
            return True, None

        for pattern in DESTRUCTIVE_PATTERNS:
            if re.search(pattern, code, re.IGNORECASE):
                log_tracker.add_event(
                    level="ERROR",
                    component="GUARDRAIL",
                    message="Destructive code execution attempt blocked by security guardrails.",
                    details={"pattern": pattern}
                )
                return False, f"Code execution blocked: detected high-risk destructive pattern matching '{pattern}'."

        return True, None

    @staticmethod
    def redact_secrets(text: str) -> str:
        """Masks detected API keys or credentials in output before rendering to user."""
        if not text:
            return ""

        redacted = text
        for pattern in SECRET_PATTERNS:
            redacted = re.sub(pattern, "[REDACTED_SECRET]", redacted)

        return redacted

guardrails = Guardrails()
