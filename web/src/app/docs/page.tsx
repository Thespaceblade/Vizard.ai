"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import {
    BookOpen,
    Code2,
    Database,
    Terminal,
    Sparkles,
    Zap,
    FileJson,
    Share2
} from "lucide-react";

export default function DocsPage() {
    return (
        <div className="min-h-screen pb-20 selection:bg-yellow selection:text-slate-900 overflow-x-hidden">
            <Header />

            <main className="max-w-5xl mx-auto px-4 pt-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-20"
                >
                    <h1 className="text-6xl font-black text-slate-900 mb-6 uppercase tracking-tighter italic">
                        Documentation<span className="text-primary not-italic">.</span>
                    </h1>
                    <p className="text-xl text-slate-600 font-bold max-w-2xl leading-relaxed">
                        The technical guide to mastering Vizard's Multi-Agent D3.js Engine.
                        Build, export, and embed stunning visualizations in seconds.
                    </p>
                </motion.div>

                <section className="grid gap-16">
                    {/* --- CORE ENGINE --- */}
                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        <div>
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 clay-card border-4 border-slate-900 shadow-[4px_4px_0px_rgba(26,28,32,1)]">
                                <Zap className="h-7 w-7" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">The D3 Engine</h2>
                            <p className="text-slate-600 font-bold leading-relaxed mb-6">
                                Vizard utilizes a proprietary multi-agent architecture to generate D3.js code.
                                Our agents analyze your data schema, identify relevant visual mappings,
                                and write custom scripts that follow modern visualization best practices.
                            </p>
                            <ul className="space-y-3 font-black text-xs uppercase tracking-widest text-slate-500">
                                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Multi-Agent Orchestration</li>
                                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Natural Language to D3</li>
                                <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> Real-time Code Validation</li>
                            </ul>
                        </div>
                        <Card className="bg-slate-900 text-white p-8 border-4 border-slate-900 shadow-[10px_10px_0px_rgba(26,28,32,0.1)]">
                            <pre className="font-mono text-xs text-secondary leading-relaxed">
                                {`// VizSpec Architecture
{
  "agents": ["Analyzer", "Coder", "Linter"],
  "engine": "D3v7",
  "optimization": "Performant",
  "output": "Scalable Vector Graphics"
}`}
                            </pre>
                        </Card>
                    </div>

                    <hr className="border-t-4 border-slate-900/5" />

                    {/* --- DATA REQUIREMENTS --- */}
                    <div className="grid md:grid-cols-2 gap-12 items-start">
                        <Card variant="white" className="order-2 md:order-1 border-4 border-slate-900 shadow-[10px_10px_0px_rgba(26,28,32,1)]">
                            <div className="space-y-4">
                                <div className="flex justify-between border-b-2 border-slate-100 pb-2">
                                    <span className="font-black text-xs text-slate-400 uppercase tracking-widest">id</span>
                                    <span className="font-black text-xs text-slate-400 uppercase tracking-widest">value</span>
                                    <span className="font-black text-xs text-slate-400 uppercase tracking-widest">category</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-900">001</span>
                                    <span className="font-bold text-slate-900">420.69</span>
                                    <span className="font-bold text-primary italic">Alpha</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold text-slate-900">002</span>
                                    <span className="font-bold text-slate-900">133.70</span>
                                    <span className="font-bold text-primary italic">Beta</span>
                                </div>
                            </div>
                        </Card>
                        <div className="order-1 md:order-2">
                            <div className="h-14 w-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center mb-6 clay-card border-4 border-slate-900 shadow-[4px_4px_0px_rgba(26,28,32,1)]">
                                <Database className="h-7 w-7" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase tracking-tight">Data Ingestion</h2>
                            <p className="text-slate-600 font-bold leading-relaxed mb-6">
                                Vizard accepts standard .CSV files. For best results, ensure your data is "tidy"
                                with clear column headers. Our system automatically handles timestamps,
                                geographical data, and hierarchical relations.
                            </p>
                            <div className="flex gap-4">
                                <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-600 border border-slate-200">CSV Only</span>
                                <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-600 border border-slate-200">Max 50MB</span>
                            </div>
                        </div>
                    </div>

                    <hr className="border-t-4 border-slate-900/5" />

                    {/* --- EXPORTING --- */}
                    <div className="bg-white rounded-[3rem] p-12 border-4 border-slate-900 shadow-[12px_12px_0px_rgba(26,28,32,1)]">
                        <div className="flex flex-col md:flex-row gap-12 items-center">
                            <div className="flex-1">
                                <h2 className="text-4xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Export Everywhere</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-100">
                                        <h4 className="font-black text-slate-900 uppercase text-sm mb-2">High-Res PNG</h4>
                                        <p className="text-xs text-slate-500 font-bold">Perfect for decks and reports.</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-100">
                                        <h4 className="font-black text-slate-900 uppercase text-sm mb-2">Interactive Embed</h4>
                                        <p className="text-xs text-slate-500 font-bold">Copy/paste full D3 runtime.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-yellow clay-card border-4 border-slate-900 flex items-center justify-center -rotate-6">
                                    <Share2 className="text-white h-8 w-8" />
                                </div>
                                <div className="h-16 w-16 rounded-2xl bg-primary clay-card border-4 border-slate-900 flex items-center justify-center rotate-6">
                                    <Sparkles className="text-white h-8 w-8" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="max-w-5xl mx-auto px-4 mt-40 pt-16 border-t-4 border-slate-900/5 text-center">
                <p className="font-black text-slate-400 uppercase tracking-[0.4em] text-xs">Vizard.ai • Docs Engine v1.0</p>
            </footer>
        </div>
    );
}
