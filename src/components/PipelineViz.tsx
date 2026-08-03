"use client";

import { useState, useImperativeHandle, forwardRef } from "react";

type NodeStatus = "idle" | "active" | "done";
type NodeId = "router" | "experienceAgent" | "projectsAgent" | "skillsAgent" | "synthesizer";

const NODE_META: Record<NodeId, { emoji: string; title: string }> = {
  router: { emoji: "🧭", title: "Router" },
  experienceAgent: { emoji: "💼", title: "Experience" },
  projectsAgent: { emoji: "🚀", title: "Projects" },
  skillsAgent: { emoji: "🛠️", title: "Skills" },
  synthesizer: { emoji: "🧵", title: "Synthesizer" },
};

export interface PipelineVizHandle {
  applyEvent: (event: { name: string; status: "active" | "done" }) => void;
  reset: () => void;
}

function Node({ id, status }: { id: NodeId; status: NodeStatus }) {
  const meta = NODE_META[id];
  return (
    <div className={`fnode ${status}`}>
      <div className="fn-emoji">{meta.emoji}</div>
      <div className="fn-title">{meta.title}</div>
      <div className="fn-state" />
    </div>
  );
}

export const PipelineViz = forwardRef<PipelineVizHandle>(function PipelineViz(_props, ref) {
  const [statuses, setStatuses] = useState<Record<NodeId, NodeStatus>>({
    router: "idle",
    experienceAgent: "idle",
    projectsAgent: "idle",
    skillsAgent: "idle",
    synthesizer: "idle",
  });

  useImperativeHandle(ref, () => ({
    applyEvent(event) {
      if (!(event.name in NODE_META)) return;
      setStatuses((prev) => ({ ...prev, [event.name]: event.status }));
    },
    reset() {
      setStatuses({
        router: "idle",
        experienceAgent: "idle",
        projectsAgent: "idle",
        skillsAgent: "idle",
        synthesizer: "idle",
      });
    },
  }));

  return (
    <div className="card">
      <div className="label">live pipeline</div>
      <div className="graph-row">
        <Node id="router" status={statuses.router} />
      </div>
      <div className="specialists-row">
        <Node id="experienceAgent" status={statuses.experienceAgent} />
        <Node id="projectsAgent" status={statuses.projectsAgent} />
        <Node id="skillsAgent" status={statuses.skillsAgent} />
      </div>
      <div className="graph-row">
        <Node id="synthesizer" status={statuses.synthesizer} />
      </div>
    </div>
  );
});
