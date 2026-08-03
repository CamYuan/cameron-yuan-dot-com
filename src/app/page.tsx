import { ChatPanel } from "@/components/ChatPanel";

export default function HomePage() {
  return (
    <div className="page">
      <div className="hero">
        <div className="wave">👋 hey, I&apos;m Cameron</div>
        <div className="role">I build AI agents that ship real software</div>
        <div className="sub">
          Ask my agent anything about my experience, projects, or skills — it&apos;s a real
          LangGraph pipeline, not a script.
        </div>
      </div>
      <ChatPanel />
    </div>
  );
}
