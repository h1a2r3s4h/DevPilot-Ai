import React from "react";

interface DevPilotMarkProps {
  className?: string;
  size?: number;
}

/**
 * Bespoke geometric compiler & architecture mark for DevPilot.
 * Represents the three interconnected layers: Codebase RAG, Autonomous Agents, and Sandboxed Execution.
 */
export const DevPilotMark: React.FC<DevPilotMarkProps> = ({ className = "", size = 18 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2L3 7L12 12L21 7L12 2Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12L12 17L21 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 17L12 22L21 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
