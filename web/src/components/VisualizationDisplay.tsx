"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Info, Maximize2, Minimize2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { InnerCard } from "./Card";
import { AgentResult } from "@/lib/agent";
interface VisualizationDisplayProps {
    result: AgentResult | null;
    isSubmitting: boolean;
    handleCopyEmbed: () => void;
    embedCopied: boolean;
}

export function VisualizationDisplay({
    result,
    isSubmitting,
    handleCopyEmbed,
    embedCopied,
}: VisualizationDisplayProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!result && !isSubmitting) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center px-12 py-20 bg-slate-50/50 rounded-[2.5rem] border-3 border-dashed border-slate-200">
                <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-10 shadow-[8px_8px_0px_rgba(26,28,32,0.1)] clay-inner">
                    <Maximize2 className="h-12 w-12 text-primary opacity-80" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4 text-shadow-sm">Ready to Visualize</h3>
                <p className="text-base text-slate-600 max-w-sm font-medium leading-relaxed">
                    Upload a CSV and describe your data to generate a <span className="text-primary font-bold italic">bespoke</span> D3.js visualization.
                </p>
            </div>
        );
    }

    /* ─── Fullscreen overlay ─── */
    const isHtml = result?.kind === "dynamic" || result?.kind === "d3code";
    const fullscreenOverlay = isFullscreen && result ? (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setIsFullscreen(false)}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[90vw] h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setIsFullscreen(false)}
                    className="absolute top-4 right-4 z-10 h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                    <X className="h-5 w-5 text-slate-600" />
                </button>
                {(result?.kind === "dynamic" || result?.kind === "d3code") && result?.html ? (
                    <iframe
                        srcDoc={result.html}
                        sandbox="allow-scripts"
                        className="w-full h-full border-0"
                        title="D3.js visualization (fullscreen)"
                    />
                ) : result?.kind === "static" && result.imageBase64 ? (
                    <img
                        src={`data:image/png;base64,${result.imageBase64}`}
                        alt="fullscreen viz"
                        className="w-full h-full object-contain p-8"
                    />
                ) : null}
            </motion.div>
        </motion.div>
    ) : null;

    return (
        <>
            <AnimatePresence>{fullscreenOverlay}</AnimatePresence>

            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm bg-primary">
                            D3
                        </div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">
                            Interactive View
                        </h2>
                    </div>
                    <div className="flex gap-3">
                        <AnimatePresence>
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex gap-2"
                                >
                                    <button
                                        onClick={() => setIsFullscreen(true)}
                                        className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors border border-slate-200"
                                        title="Fullscreen"
                                    >
                                        <Maximize2 className="h-4 w-4 text-slate-600" />
                                    </button>
                                    <Button variant="accent" size="sm" onClick={handleCopyEmbed} className="h-10 rounded-xl px-4">
                                        <Copy className="mr-2 h-4 w-4" />
                                        {embedCopied ? "COPIED!" : "EMBED"}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <InnerCard className="relative flex items-center justify-center overflow-hidden bg-white p-0 border-4 border-slate-900/5 group">
                    {isSubmitting ? (
                        <div className="flex flex-col items-center justify-center gap-8 px-12 py-20 text-center min-h-[550px]">
                            <div className="relative h-24 w-24">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="absolute inset-0 rounded-[2rem] border-4 border-primary/20"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    className="absolute inset-0 rounded-[2rem] border-4 border-primary border-t-transparent border-r-transparent"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                </div>
                            </div>
                            <div className="max-w-xs">
                                <p className="text-2xl font-black text-slate-900 tracking-tight mb-2">Generating D3 Code</p>
                                <p className="text-sm text-slate-600 font-bold uppercase tracking-[0.2em] italic">AI Agent writing visualization...</p>
                            </div>
                        </div>
                    ) : (result?.kind === "dynamic" || result?.kind === "d3code") && result?.html ? (
                        <motion.iframe
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            ref={iframeRef}
                            srcDoc={result.html}
                            sandbox="allow-scripts"
                            className="w-full border-0"
                            style={{ height: "600px" }}
                            title="D3.js visualization"
                        />
                    ) : result?.kind === "static" && result.imageBase64 ? (
                        <motion.img
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            src={`data:image/png;base64,${result.imageBase64}`}
                            alt="Generated visualization"
                            className="w-full max-h-[600px] object-contain p-4"
                        />
                    ) : null}

                    {/* Visual accents */}
                    <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-slate-900/5" />
                    <div className="absolute top-4 right-10 h-3 w-3 rounded-full bg-slate-900/5" />
                    <div className="absolute top-4 right-16 h-3 w-3 rounded-full bg-slate-900/5" />
                </InnerCard>

                {result?.explanation && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3 px-1">
                            <div className="h-6 w-6 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                                <Info className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Agent Insights</span>
                        </div>
                        <div className="clay-inner rounded-2xl p-6 bg-slate-100/50 border-2 border-slate-900/10">
                            <p className="text-base leading-relaxed text-slate-700 font-medium">
                                {result.explanation}
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </>
    );
}
