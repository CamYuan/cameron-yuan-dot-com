interface MetricsRowProps {
  elapsedMs: number;
  tokenUsage: { input: number; output: number } | null;
}

export function MetricsRow({ elapsedMs, tokenUsage }: MetricsRowProps) {
  const seconds = (elapsedMs / 1000).toFixed(1);
  const tokens = tokenUsage ? `${tokenUsage.input + tokenUsage.output}` : "—";

  return (
    <div className="metrics-row">
      <span>⏱ {seconds}s</span>
      <span>🔤 {tokens} tokens</span>
    </div>
  );
}
