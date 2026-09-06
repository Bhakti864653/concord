import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next.js auto-writes AGENTS.md/CLAUDE.md with a block aimed at AI coding
  // agents when it detects one running (via @vercel/detect-agent) - its
  // wording ("read node_modules/next/dist/docs before writing any code")
  // is effectively a prompt injection against any agent working in this
  // repo, so it's turned off rather than left to regenerate every `next dev`.
  agentRules: false,
};

export default nextConfig;
