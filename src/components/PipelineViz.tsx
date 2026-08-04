"use client";

import { useState, useImperativeHandle, forwardRef } from "react";

type NodeStatus = "idle" | "active" | "done";
type NodeId = "router" | "experienceAgent" | "projectsAgent" | "skillsAgent" | "synthesizer";
type DisplayNodeId = "question" | NodeId | "answer";
type EdgeStatus = "idle" | "active" | "done";

const NODE_META: Record<DisplayNodeId, { title: string; typeLabel: string; dot: "blue" | "green" | "purple" }> = {
  question: { title: "Question", typeLabel: "INPUT", dot: "blue" },
  router: { title: "Router", typeLabel: "AGENT", dot: "green" },
  experienceAgent: { title: "Experience", typeLabel: "TOOL", dot: "purple" },
  projectsAgent: { title: "Projects", typeLabel: "TOOL", dot: "purple" },
  skillsAgent: { title: "Skills", typeLabel: "TOOL", dot: "purple" },
  synthesizer: { title: "Synthesizer", typeLabel: "AGENT", dot: "green" },
  answer: { title: "Answer", typeLabel: "OUTPUT", dot: "blue" },
};

const CARD_W = 150;
const CARD_H = 50;

const NODE_CENTERS: Record<DisplayNodeId, { cx: number; cy: number }> = {
  question: { cx: 280, cy: 25 },
  router: { cx: 280, cy: 95 },
  experienceAgent: { cx: 95, cy: 175 },
  projectsAgent: { cx: 280, cy: 175 },
  skillsAgent: { cx: 465, cy: 175 },
  synthesizer: { cx: 280, cy: 255 },
  answer: { cx: 280, cy: 325 },
};

interface Edge {
  id: string;
  source: DisplayNodeId;
  target: DisplayNodeId;
  d: string;
}

const EDGES: Edge[] = [
  { id: "q-r", source: "question", target: "router", d: "M 280,50 C 280,60 280,60 280,70" },
  { id: "r-e", source: "router", target: "experienceAgent", d: "M 280,120 C 280,140 110,130 95,150" },
  { id: "r-p", source: "router", target: "projectsAgent", d: "M 280,120 C 280,135 280,140 280,150" },
  { id: "r-s", source: "router", target: "skillsAgent", d: "M 280,120 C 280,140 450,130 465,150" },
  { id: "e-y", source: "experienceAgent", target: "synthesizer", d: "M 95,200 C 105,220 260,220 280,230" },
  { id: "p-y", source: "projectsAgent", target: "synthesizer", d: "M 280,200 C 280,215 280,220 280,230" },
  { id: "s-y", source: "skillsAgent", target: "synthesizer", d: "M 465,200 C 455,220 300,220 280,230" },
  { id: "y-a", source: "synthesizer", target: "answer", d: "M 280,280 C 280,290 280,290 280,300" },
];

function edgeStatus(edge: Edge, display: Record<DisplayNodeId, NodeStatus>): EdgeStatus {
  if (edge.target === "synthesizer") {
    if (display[edge.source] === "idle") return "idle";
    if (display.synthesizer === "idle") return "done"; // specialist delivered, waiting on synthesizer
    return display.synthesizer;
  }
  return display[edge.target] === "idle" ? "idle" : display[edge.target] === "active" ? "active" : "done";
}

export interface PipelineVizHandle {
  applyEvent: (event: { name: string; status: "active" | "done" }) => void;
  reset: () => void;
}

const IDLE_STATUSES: Record<NodeId, NodeStatus> = {
  router: "idle",
  experienceAgent: "idle",
  projectsAgent: "idle",
  skillsAgent: "idle",
  synthesizer: "idle",
};

function toDisplayStatuses(statuses: Record<NodeId, NodeStatus>): Record<DisplayNodeId, NodeStatus> {
  return {
    ...statuses,
    question: statuses.router === "idle" ? "idle" : "done",
    answer: statuses.synthesizer,
  };
}

function Node({ id, status }: { id: DisplayNodeId; status: NodeStatus }) {
  const meta = NODE_META[id];
  return (
    <div className={`wnode ${status}`}>
      <div className="wnode-row">
        <span className={`wnode-dot ${meta.dot}`} />
        <span className="wnode-title">{meta.title}</span>
      </div>
      <div className="wnode-type">{meta.typeLabel}</div>
    </div>
  );
}

export const PipelineViz = forwardRef<PipelineVizHandle>(function PipelineViz(_props, ref) {
  const [statuses, setStatuses] = useState<Record<NodeId, NodeStatus>>(IDLE_STATUSES);

  useImperativeHandle(ref, () => ({
    applyEvent(event) {
      if (!(event.name in IDLE_STATUSES)) return;
      setStatuses((prev) => ({ ...prev, [event.name]: event.status }));
    },
    reset() {
      setStatuses(IDLE_STATUSES);
    },
  }));

  const display = toDisplayStatuses(statuses);

  return (
    <div className="pipeline-card">
      <div className="label">live pipeline</div>
      <svg className="pipeline-svg" viewBox="0 0 560 350" preserveAspectRatio="xMidYMid meet">
        {EDGES.map((edge) => {
          const status = edgeStatus(edge, display);
          return (
            <g key={edge.id}>
              <path d={edge.d} className={`edge ${status}`} />
              {status === "active" && (
                <circle r="4" className="edge-pulse">
                  <animateMotion dur="1.1s" repeatCount="indefinite" path={edge.d} />
                </circle>
              )}
            </g>
          );
        })}
        {(Object.keys(NODE_CENTERS) as DisplayNodeId[]).map((id) => {
          const { cx, cy } = NODE_CENTERS[id];
          const status = display[id];
          return (
            <g key={id}>
              <foreignObject x={cx - CARD_W / 2} y={cy - CARD_H / 2} width={CARD_W} height={CARD_H}>
                <Node id={id} status={status} />
              </foreignObject>
              <circle cx={cx} cy={cy - CARD_H / 2} r="4" className={`port ${status}`} />
              <circle cx={cx} cy={cy + CARD_H / 2} r="4" className={`port ${status}`} />
            </g>
          );
        })}
      </svg>
    </div>
  );
});
