"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 py-4 px-4">
            <div className="max-w-[1200px] mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white shadow-sm border border-slate-200/60 px-6 py-3 rounded-2xl flex items-center justify-between"
                >
                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                            <Image
                                src="/logo.png"
                                alt="Vizard"
                                width={28}
                                height={28}
                                className="object-contain brightness-0 invert"
                            />
                        </div>
                        <span className="font-bold text-slate-900 text-lg tracking-tight">
                            Vizard<span className="text-primary">.ai</span>
                        </span>
                    </div>

                    {/* Nav */}
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
                        <a href="#playground" className="hover:text-slate-900 transition-colors">Playground</a>
                        <a href="/docs" className="hover:text-slate-900 transition-colors">Resources</a>
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <a
                            href="#playground"
                            className="px-5 py-2 bg-green text-white font-semibold text-sm rounded-lg hover:bg-green-dark transition-colors shadow-sm"
                        >
                            Start Visualizing
                        </a>
                    </div>
                </motion.div>
            </div>
        </header>
    );
}
