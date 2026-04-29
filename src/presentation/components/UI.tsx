import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  size = "md",
  isLoading,
  children,
  ...props
}) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm disabled:bg-slate-300",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
    ghost: "hover:bg-slate-100 text-slate-600",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-5",
    lg: "h-13 px-8 text-lg font-semibold",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-[0.98] disabled:pointer-events-none gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({
  children,
  className,
  id
}) => {
  return (
    <div id={id} className={cn("bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({
  label,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700 ml-0.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all",
          className
        )}
        {...props}
      />
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: "slate" | "indigo" | "rose" | "emerald" | "amber" | "blue" }> = ({
  children,
  color = "slate",
}) => {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-700",
    rose: "bg-rose-100 text-rose-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", colors[color])}>
      {children}
    </span>
  );
};
