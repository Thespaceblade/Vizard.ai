"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
    children: React.ReactNode;
    className?: string;
    animate?: boolean;
    variant?: "white" | "primary" | "secondary" | "accent" | "yellow";
}

export function Card({
    children,
    className,
    animate = true,
    variant = "white"
}: CardProps) {
    const Component = animate ? motion.div : "div";

    const backgrounds = {
        white: "bg-white",
        primary: "bg-primary/10",
        secondary: "bg-secondary/10",
        accent: "bg-accent/10",
        yellow: "bg-yellow/10",
    };

    return (
        <Component
            initial={animate ? { opacity: 0, y: 30 } : undefined}
            animate={animate ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
            className={cn("clay-card p-6 sm:p-8", backgrounds[variant], className)}
        >
            {children}
        </Component>
    );
}

export function InnerCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("clay-inner rounded-3xl p-6 bg-[#f8fafc]/50 border-2 border-slate-900/5", className)}>
            {children}
        </div>
    );
}
