"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "accent" | "yellow" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
}

export function Button({
    className,
    variant = "primary",
    size = "md",
    isLoading,
    children,
    ...rest
}: ButtonProps) {
    const variants = {
        primary: "bg-primary text-white hover:bg-primary/90",
        secondary: "bg-secondary text-white hover:bg-secondary/90",
        accent: "bg-accent text-white hover:bg-accent/90",
        yellow: "bg-yellow text-slate-900 hover:bg-yellow/90",
        outline: "bg-white text-slate-900 shadow-none hover:bg-slate-50",
        ghost: "text-slate-600 hover:bg-black/5 shadow-none border-transparent",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-8 py-4 text-base",
    };

    const MotionButton = motion.button as any;

    return (
        <MotionButton
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.95, y: 1 }}
            className={cn(
                "clay-button inline-flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading || rest.disabled}
            {...rest}
        >
            {isLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : null}
            {children}
        </MotionButton>
    );
}
