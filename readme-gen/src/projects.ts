// Project tiles. Numbers here are the ones each project's own README backs up.
export interface Project {
  id: string;
  name: string;
  tagline: string;
  metric: string;
  metricLabel: string;
  status?: string;
  stack: string[];
}

export const projects: Project[] = [
  {
    id: "clishe",
    name: "Clishe",
    tagline: "Plain English in, the real shell command out. Offline-first, AI optional.",
    metric: "v0.9.0",
    metricLabel: "7 releases · PyPI and the AUR",
    stack: ["Python", "Bash", "Ollama"],
  },
  {
    id: "blot",
    name: "Blot",
    tagline: "A pre-commit check that has read your project's history.",
    metric: "~2 s",
    metricLabel: "to index Flask's 3,800 commits",
    status: "pre-alpha",
    stack: ["Python", "git hooks", "SQLite"],
  },
  {
    id: "polyphage",
    name: "Polyphage",
    tagline: "Multi-objective design of IsPETase variants for PET-plastic degradation.",
    metric: "p = 0.034",
    metricLabel: "D186H recovered blind, 20-seed replication",
    stack: ["Python", "ProteinMPNN", "NSGA-II"],
  },
  {
    id: "wildid",
    name: "WildID",
    tagline: "Identifies endangered marine species from a single photo.",
    metric: "98.47%",
    metricLabel: "accuracy across 66 CITES-protected species",
    stack: ["Dart", "Flutter", "PyTorch"],
  },
];
