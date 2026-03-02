"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from "react";

interface VizSuggestion {
  viz_type: string;
  x: string | null;
  y: string | null;
  label: string;
}

type AgentResult =
  | {
      kind: "static";
      imageBase64: string;
      explanation?: string;
      suggestions?: VizSuggestion[];
    }
  | {
      kind: "dynamic";
      html: string;
      explanation?: string;
      suggestions?: VizSuggestion[];
    };

type AgentResponse =
  | { ok: true; result: AgentResult }
  | { ok: false; error: string };

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [csvBase64, setCsvBase64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<AgentResult | null>(null);
  const [suggestions, setSuggestions] = useState<VizSuggestion[]>([]);
  const [downloadName, setDownloadName] = useState("vizard.png");
  const [embedCopied, setEmbedCopied] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const callAgent = useCallback(
    async (overridePrompt?: string) => {
      const activePrompt = overridePrompt ?? prompt;
      const activeCsv = csvBase64;

      if (!activeCsv && !file) {
        setError("Please upload a CSV file.");
        return;
      }

      setError(null);
      setResult(null);
      setEmbedCopied(false);
      setIsSubmitting(true);

      try {
        const formData = new FormData();
        if (file && !activeCsv) {
          formData.append("file", file);
        } else if (activeCsv) {
          formData.append("csvBase64", activeCsv);
        }
        formData.append("prompt", activePrompt);

        const res = await fetch("/api/agent", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as AgentResponse;
        if (!data.ok) {
          throw new Error(
            data.error || "Agent failed to generate visualization.",
          );
        }

        setResult(data.result);
        setSuggestions(data.result.suggestions ?? []);

        if (file?.name) {
          const base = file.name.replace(/\.[^.]+$/, "");
          setDownloadName(`${base}-vizard.png`);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error occurred.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [csvBase64, file, prompt],
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    callAgent();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreviewName(selected ? selected.name : null);
    setCsvBase64(null);

    if (selected) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(",")[1];
        setCsvBase64(b64);
      };
      reader.readAsDataURL(selected);
    }
  }

  function handleSuggestionClick(s: VizSuggestion) {
    const newPrompt = `${s.viz_type} chart: x=${s.x ?? "auto"}, y=${s.y ?? "auto"}`;
    setPrompt(newPrompt);
    callAgent(newPrompt);
  }

  async function handleCopyEmbed() {
    if (result?.kind !== "dynamic") return;
    try {
      await navigator.clipboard.writeText(result.html);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      setError("Failed to copy to clipboard.");
    }
  }

  async function handleDownloadPdf() {
    if (!csvBase64 || !result || result.kind !== "static") return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("csvBase64", csvBase64);
      formData.append("prompt", prompt + " [pdf]");

      const res = await fetch("/api/agent", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as AgentResponse;
      if (!data.ok || data.result.kind !== "static") return;

      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.result.imageBase64}`;
      link.download = downloadName.replace(/\.png$/, ".pdf");
      link.click();
    } finally {
      setIsSubmitting(false);
    }
  }

  const isStatic = result?.kind === "static";
  const isDynamic = result?.kind === "dynamic";

  return (
    <div className="min-h-screen bg-deep-vizard-blue flex flex-col items-center px-4 py-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.12),transparent)] pointer-events-none" aria-hidden />
      {/* Homepage header: Deep Vizard Blue, Off White text */}
      <header className="relative z-10 w-full max-w-5xl flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="relative h-10 w-10 shrink-0">
            <Image
              src="/logo.png"
              alt="Vizard.ai"
              width={40}
              height={40}
              className="object-contain"
            />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-off-white">
              Vizard.ai
            </h1>
            <p className="text-sm text-off-white/80 mt-1 font-normal">
              Upload a CSV, describe the visualization, and let the agent craft
              an aesthetic chart for you.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-off-white/30 px-3 py-1 text-xs font-medium text-off-white">
          Aesthetic Data Visualization
        </span>
      </header>

      <main className="relative z-10 w-full max-w-5xl rounded-3xl border border-slate-gray/20 bg-off-white shadow-2xl p-6 sm:p-8">

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
        >
          {/* Left column: inputs — Slate Gray text on Off White, Spark Orange accent */}
          <section className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-gray">
                CSV Upload
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-gray/30 bg-white px-4 py-3 text-sm text-slate-gray hover:border-vizard-blue/50 transition-colors">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {previewName ?? "Choose a .csv file"}
                  </span>
                  <span className="text-xs text-slate-gray/70">
                    Max a few MB for best performance.
                  </span>
                </div>
                <span className="rounded-full bg-vizard-blue/10 px-3 py-1 text-xs font-semibold text-vizard-blue">
                  Browse
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="prompt"
                className="text-sm font-medium text-slate-gray"
              >
                Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-slate-gray/30 bg-white px-3 py-2 text-sm text-slate-gray shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vizard-blue/50 focus-visible:border-vizard-blue transition-colors"
                placeholder='e.g. "Interactive bar chart of sales by region, bold theme" or "World map of GDP by country"'
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center rounded-full bg-spark-orange px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-spark-orange/30 transition hover:bg-spark-orange/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Generating..." : "Generate Visualization"}
            </button>

            {error && (
              <p className="text-xs font-medium text-red-500">{error}</p>
            )}

            {/* Quick ideas: Insight Teal active, Spark Orange hover */}
            {suggestions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium text-slate-gray uppercase tracking-wide">
                  Quick ideas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSuggestionClick(s)}
                      disabled={isSubmitting}
                      className="rounded-lg border border-slate-gray/25 bg-white px-2.5 py-1 text-[11px] text-slate-gray hover:border-spark-orange/60 hover:text-spark-orange hover:bg-spark-orange/5 transition-colors disabled:opacity-50"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right column: preview — chart UI uses Vizard Blue / Teal / Orange */}
          <section className="space-y-3 rounded-2xl border border-slate-gray/20 bg-slate-gray/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-gray">
                Visualization Preview
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-slate-gray/70">
                {isDynamic ? "Interactive (Plotly)" : "Static PNG"}
              </span>
            </div>

            <div className="relative flex min-h-[320px] items-center justify-center rounded-xl border border-slate-gray/20 bg-white overflow-hidden">
              {isSubmitting ? (
                <div className="flex flex-col items-center justify-center gap-4 w-full py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-gray/20 border-t-spark-orange" aria-hidden />
                  <p className="text-sm text-slate-gray font-medium">Preparing your visualization…</p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-gray/40 animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-insight-teal/60 animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-spark-orange animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              ) : isStatic && result?.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${result.imageBase64}`}
                  alt="Generated visualization"
                  className="max-h-[400px] w-full object-contain"
                />
              ) : isDynamic && result?.html ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={result.html}
                  sandbox="allow-scripts"
                  className="h-[400px] w-full rounded-lg border-0"
                  title="Dynamic visualization"
                />
              ) : (
                <p className="text-xs text-slate-gray/70 text-center px-6 font-normal">
                  Upload a CSV and describe your ideal chart to see an aesthetic
                  visualization appear here.
                </p>
              )}
            </div>

            {/* Export controls — Spark Orange accent */}
            {result && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {isStatic && (
                  <>
                    <a
                      href={`data:image/png;base64,${result.imageBase64}`}
                      download={downloadName}
                      className="inline-flex items-center rounded-full border border-slate-gray/30 bg-white px-4 py-2 text-xs font-semibold text-slate-gray hover:border-spark-orange/60 hover:text-spark-orange transition-colors"
                    >
                      Download PNG
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isSubmitting}
                      className="inline-flex items-center rounded-full border border-slate-gray/30 bg-white px-4 py-2 text-xs font-semibold text-slate-gray hover:border-spark-orange/60 hover:text-spark-orange transition-colors disabled:opacity-50"
                    >
                      Download PDF
                    </button>
                  </>
                )}
                {isDynamic && (
                  <button
                    type="button"
                    onClick={handleCopyEmbed}
                    className="inline-flex items-center rounded-full bg-spark-orange/10 border border-spark-orange/40 px-4 py-2 text-xs font-semibold text-spark-orange hover:bg-spark-orange hover:text-white transition-colors"
                  >
                    {embedCopied ? "Copied!" : "Copy Embed Code"}
                  </button>
                )}
              </div>
            )}

            {/* Agent notes */}
            {result?.explanation && (
              <div className="rounded-xl border border-slate-gray/20 bg-slate-gray/5 p-3">
                <p className="text-xs font-medium text-slate-gray">
                  Agent notes
                </p>
                <p className="mt-1 text-xs text-slate-gray/80 whitespace-pre-wrap font-normal">
                  {result.explanation}
                </p>
              </div>
            )}
          </section>
        </form>

        <footer className="mt-6 flex items-center justify-between text-[11px] text-slate-gray/70 font-normal">
          <span>Vizard.ai</span>
          <span>Static + Dynamic + Maps + Export</span>
        </footer>
      </main>
    </div>
  );
}
