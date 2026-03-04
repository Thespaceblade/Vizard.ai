"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Shield,
  Zap,
  Users,
  Bell,
  ArrowRight,
  Check,
  Play,
  Activity,
  Globe,
  Lock,
  CheckCircle,
  Plus,
  Rocket,
  MessageCircle,
  Upload,
  Code2,
  Database,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/Input";
import { VisualizationDisplay } from "@/components/VisualizationDisplay";
import { AgentResult } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !prompt) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    if (file) formData.append("file", file);
    formData.append("prompt", prompt);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate visual");

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC]">
      <Header />

      <main>
        {/* ═══════════════════════════════════════ */}
        {/* HERO */}
        {/* ═══════════════════════════════════════ */}
        <section className="max-w-[1200px] mx-auto px-6 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green/10 rounded-full text-green text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-green animate-pulse" />
              Agent-Driven D3.js Visualizations
            </span>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-slate-900 leading-[1.1] mb-5 tracking-tight">
                Transform Data{" "}
                <br className="hidden sm:block" />
                Into <span className="gradient-text">Actionable Insights</span>
              </h1>

              <p className="text-base text-slate-500 mb-8 max-w-md leading-relaxed">
                Drop your CSV and let our multi-agent AI system craft custom, interactive D3.js
                visualizations in seconds. No coding required.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-10">
                <a
                  href="#playground"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green text-white font-semibold text-sm rounded-lg hover:bg-green-dark transition-colors shadow-sm"
                >
                  Start Visualizing Now
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </motion.div>

            {/* Right — Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="glass-card p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Example: Revenue & Users</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-blue" /> Revenue
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-green" /> Users
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="h-2 w-2 rounded-full bg-purple" /> Growth
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-green bg-green/10 px-2.5 py-1 rounded-full">Auto-generated</span>
                </div>

                <div className="relative h-40 mb-4">
                  <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
                    <line x1="0" y1="30" x2="400" y2="30" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4" />
                    <line x1="0" y1="60" x2="400" y2="60" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4" />
                    <line x1="0" y1="90" x2="400" y2="90" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4" />

                    <motion.path
                      d="M 0 90 Q 50 85 100 70 T 200 50 T 300 35 T 400 25"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2 }}
                    />
                    {[
                      [100, 70], [200, 50], [300, 35], [360, 28]
                    ].map(([cx, cy], i) => (
                      <motion.circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill="#3B82F6"
                        stroke="white"
                        strokeWidth="2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 + i * 0.3 }}
                      />
                    ))}

                    <motion.path
                      d="M 0 100 Q 80 90 160 80 T 280 65 T 400 50"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: 0.3 }}
                    />
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Code2, label: "Engine", value: "D3.js", color: "text-blue" },
                    { icon: Sparkles, label: "Agents", value: "Active", color: "text-primary" },
                    { icon: TrendingUp, label: "Insights", value: "Instant", color: "text-green" },
                  ].map((kpi, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + i * 0.2 }}
                      className="glass-card p-3 text-center"
                    >
                      <div className="flex items-center gap-1.5 justify-center mb-1">
                        <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                        <span className="text-[10px] font-medium text-slate-400">{kpi.label}</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="absolute -top-10 -right-10 w-60 h-60 bg-gradient-to-br from-primary/10 via-purple/10 to-cyan/5 rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* AI PLAYGROUND */}
        {/* ═══════════════════════════════════════ */}
        <section id="playground" className="max-w-[1200px] mx-auto px-6 py-16 scroll-mt-24 relative">
          <div className="absolute inset-0 bg-primary/5 -skew-y-2 -z-10" />

          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Data Visualization <span className="gradient-text">Playground</span>
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
              Upload your raw data, describe what you want to see, and watch our agents build the perfect D3.js chart.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10">
            {/* Left — Form */}
            <div className="glass-card p-8 border-2 border-white/60 shadow-xl bg-white/40">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <div className="h-6 w-6 bg-primary/10 text-primary flex items-center justify-center rounded-md">
                      <Database className="h-3 w-3" />
                    </div>
                    Data Source
                  </label>
                  <label className="group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-300 bg-white/50 p-10 text-center transition-all hover:bg-white/80 hover:border-primary/50 overflow-hidden">
                    <div className="rounded-xl bg-white p-3 text-primary shadow-sm group-hover:scale-110 transition-transform border border-slate-100">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {file ? file.name : "Choose CSV File"}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : "Drop your data here"}
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <div className="h-6 w-6 bg-purple/10 text-purple flex items-center justify-center rounded-md">
                      <MessageCircle className="h-3 w-3" />
                    </div>
                    What should we build?
                  </label>
                  <Textarea
                    placeholder="e.g. 'Show me a scatter plot comparing sales vs marketing spend...'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[140px] rounded-xl p-5 bg-white/60 border border-slate-200 focus:bg-white focus:border-primary/30 transition-all text-sm font-medium leading-relaxed shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-4 bg-gradient-to-r from-primary to-purple text-white font-bold tracking-wide text-sm shadow-md hover:shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Rocket className="h-4 w-4 animate-bounce" />
                      ANALYZING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      GENERATE VISUALIZATION
                    </>
                  )}
                </button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 font-medium text-sm text-center justify-center"
                  >
                    <Activity className="h-4 w-4" />
                    {error}
                  </motion.div>
                )}
              </form>
            </div>

            {/* Right — Viz Display */}
            <div className="flex flex-col gap-6">
              <VisualizationDisplay
                result={result}
                isSubmitting={isSubmitting}
                handleCopyEmbed={() => {
                  if (result?.html) {
                    navigator.clipboard.writeText(result.html);
                  }
                }}
                embedCopied={false}
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* FEATURES */}
        {/* ═══════════════════════════════════════ */}
        <section id="features" className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Powerful Agentic Capabilities
            </h2>
            <p className="text-base text-slate-500 max-w-lg mx-auto">
              Behind the scenes, specialized agents work together to understand your data and write perfect code.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Database,
                title: "Data Analysis",
                desc: "The Analyzer Agent parses your CSV, detects types, handles missing values, and calculates statistics.",
                color: "bg-blue/10 text-blue",
              },
              {
                icon: Code2,
                title: "Code Generation",
                desc: "The Coder Agent takes the analysis and your intent to generate custom, bug-free D3.js visualization code.",
                color: "bg-primary/10 text-primary",
              },
              {
                icon: Shield,
                title: "Data Privacy",
                desc: "Your data stays in the browser. Only the schema and statistics are sent to the AI, ensuring complete security.",
                color: "bg-green/10 text-green",
              },
              {
                icon: Globe,
                title: "Interactive Output",
                desc: "Get fully interactive HTML/JS outputs with tooltips, zooming, and responsive layouts.",
                color: "bg-purple/10 text-purple",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-6 border-slate-200/60 hover:shadow-lg hover:border-primary/20 transition-all bg-white/40"
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900 text-base mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* CTA */}
        {/* ═══════════════════════════════════════ */}
        <section className="max-w-[1200px] mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary to-purple rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden shadow-2xl"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
              Ready to Visualize?
            </h2>
            <p className="text-base text-white/80 mb-8 max-w-md mx-auto font-medium">
              Start generating beautiful, interactive data visualizations right now. Open source and totally free.
            </p>
            <a
              href="#playground"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary font-bold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5"
            >
              Go to Playground
              <ArrowRight className="h-4 w-4" />
            </a>

            <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ═══════════════════════════════════════ */}
        <footer className="max-w-[1200px] mx-auto px-6 pt-14 pb-8 border-t border-slate-200 mt-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-10">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <Image src="/logo.png" alt="Vizard" width={24} height={24} className="object-contain brightness-0 invert" />
                </div>
                <span className="font-bold text-slate-900">Vizard<span className="text-primary">.ai</span></span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                Transform your data into actionable insights with our multi-agent AI visualization system.
              </p>
            </div>

            {/* Links */}
            {[
              {
                title: "Product",
                links: [
                  { label: "Playground", href: "#playground" },
                  { label: "Features", href: "#features" },
                  { label: "API", href: "/api/docs" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { label: "Documentation", href: "/docs" },
                  { label: "GitHub", href: "https://github.com" },
                  { label: "Examples", href: "#" },
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="font-semibold text-slate-900 text-sm mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href={link.href} className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-slate-100 gap-3">
            <p className="text-xs text-slate-400">&copy; 2024 Vizard.ai. Open Source.</p>
            <div className="flex gap-4">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                <span className="h-1.5 w-1.5 rounded-full bg-green" /> Multi-Agent Engine
              </span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
