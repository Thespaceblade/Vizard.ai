export interface AgentResult {
    kind: "dynamic";
    html: string;
    explanation?: string;
    suggestions?: VizSuggestion[];
}

export interface VizSuggestion {
    viz_type: string;
    x: string | null;
    y: string | null;
    label: string;
}
