"use client";

import { useRef, useState } from "react";
import { PipelineViz, type PipelineVizHandle } from "@/components/PipelineViz";
import { SingleAgentPanel, type SingleAgentPanelHandle } from "@/components/SingleAgentPanel";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
  citations?: string[];
}

const SUGGESTIONS = [
  "Have you worked with microservices?",
  "What AI skills do you have?",
  "Tell me about a project you built",
];

const OVERLOADED_MESSAGE = "my agent's a little overloaded — try again in a moment";

async function* readNdjson(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line);
    }
  }
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const vizRef = useRef<PipelineVizHandle>(null);
  const singleRef = useRef<SingleAgentPanelHandle>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    vizRef.current?.reset();
    singleRef.current?.reset();

    try {
      const res = await fetch(compareMode ? "/api/interview/compare" : "/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.body) throw new Error("no response body");

      for await (const event of readNdjson(res.body)) {
        if (compareMode) {
          if (event.flow === "single") {
            if (event.type === "node") singleRef.current?.setStatus(event.status);
            else if (event.type === "result") singleRef.current?.setResult(event);
            else if (event.type === "error") singleRef.current?.setError(event.message);
          } else if (event.flow === "graph") {
            if (event.type === "node") vizRef.current?.applyEvent(event);
            else if (event.type === "result") vizRef.current?.setResult(event);
            else if (event.type === "error") vizRef.current?.setError(event.message);
          }
        } else {
          if (event.type === "node") {
            vizRef.current?.applyEvent(event);
          } else if (event.type === "result") {
            setMessages((prev) => [
              ...prev,
              { role: "bot", text: event.finalAnswer, citations: event.citations },
            ]);
          } else if (event.type === "error") {
            setMessages((prev) => [...prev, { role: "bot", text: event.message }]);
          }
        }
      }
    } catch {
      if (compareMode) {
        singleRef.current?.setError(OVERLOADED_MESSAGE);
        vizRef.current?.setError(OVERLOADED_MESSAGE);
      } else {
        setMessages((prev) => [...prev, { role: "bot", text: OVERLOADED_MESSAGE }]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`demo-layout ${compareMode ? "compare" : ""}`}>
      <div className="card">
        <div className="compare-toggle-row">
          <label className="compare-toggle">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
            />
            Compare with a single agent
          </label>
        </div>
        <div className="chat-log">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="fmsg-user">{m.text}</div>
            ) : (
              <div key={i} className="fmsg-bot">
                {m.text}
                <div>
                  {m.citations?.map((c) => (
                    <span key={c} className="cite">🔗 {c}</span>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
        <div className="chat-input-row">
          <input
            className="chat-input"
            value={input}
            placeholder="e.g. Have you worked with microservices?"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
          />
          <button className="chat-send" onClick={() => ask(input)} disabled={busy}>
            Ask →
          </button>
        </div>
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <div key={s} className="suggestion" onClick={() => ask(s)}>
              {s}
            </div>
          ))}
        </div>
      </div>
      {compareMode && <SingleAgentPanel ref={singleRef} />}
      <PipelineViz ref={vizRef} />
    </div>
  );
}
