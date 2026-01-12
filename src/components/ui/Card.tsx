import { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
  variant?: "default" | "elevated" | "outlined" | "glass";
  interactive?: boolean;
}

export function Card({
  children,
  className = "",
  as: Component = "div",
  variant = "default",
  interactive = false,
}: CardProps) {
  const variantStyles = {
    default: "bg-white border border-slate-200 shadow-sm",
    elevated: "bg-white border border-slate-100 shadow-lg shadow-slate-200/50",
    outlined: "bg-transparent border-2 border-slate-200",
    glass: "bg-white/80 backdrop-blur-xl border border-white/20 shadow-lg",
  };

  return (
    <Component
      className={`
        rounded-2xl
        ${variantStyles[variant]}
        ${interactive ? "card-interactive cursor-pointer" : ""}
        ${className}
      `.trim()}
    >
      {children}
    </Component>
  );
}

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  noBorder?: boolean;
}

export function CardHeader({ children, className = "", noBorder = false }: CardHeaderProps) {
  return (
    <div className={`px-6 py-5 ${noBorder ? "" : "border-b border-slate-100"} ${className}`}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4";
}

export function CardTitle({
  children,
  className = "",
  as: Component = "h3",
}: CardTitleProps) {
  return (
    <Component className={`text-xl font-bold text-slate-900 tracking-tight ${className}`}>
      {children}
    </Component>
  );
}

export interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({
  children,
  className = "",
}: CardDescriptionProps) {
  return (
    <p className={`text-sm text-slate-500 mt-2 leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = "" }: CardFooterProps) {
  return (
    <div
      className={`px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl ${className}`}
    >
      {children}
    </div>
  );
}
