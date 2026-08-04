"use client";

import { useState, useImperativeHandle, forwardRef } from "react";
import { MetricsRow } from "@/components/MetricsRow";

type Status = "idle" | "active" | "done";

interface Result {
  finalAnswer: string;
  elapsedMs: number;
  tokenUsage: { input: number; output: number } | null;
}

export interface SingleAgentPanelHandle {
  setStatus: (status: Status) => void;
  setResult: (result: Result) => void;
  setError: (message: string) => void;
  reset: () => void;
}

export const SingleAgentPanel = forwardRef<SingleAgentPanelHandle>(function SingleAgentPanel(_props, ref) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    setStatus(next) {
      setStatus(next);
    },
    setResult(next) {
      setResult(next);
      setError(null);
    },
    setError(message) {
      setError(message);
      setResult(null);
    },
    reset() {
      setStatus("idle");
      setResult(null);
      setError(null);
    },
  }));

  return (
    <div className="pipeline-card">
      <div className="label">single agent</div>
      <div className="single-agent-node-wrap">
        <div className={`wnode ${status}`} style={{ width: 150, height: 50 }}>
          <div className="wnode-row">
            <span className="wnode-dot blue" />
            <span className="wnode-title">Single Agent</span>
          </div>
          <div className="wnode-type">AGENT</div>
        </div>
      </div>
      {error && <div className="fmsg-bot">{error}</div>}
      {result && (
        <>
          <div className="fmsg-bot">{result.finalAnswer}</div>
          <MetricsRow elapsedMs={result.elapsedMs} tokenUsage={result.tokenUsage} />
        </>
      )}
    </div>
  );
});
