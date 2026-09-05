"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface ScaleOnHoverProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  scale?: number;
  tapScale?: number;
  className?: string;
}

export function ScaleOnHover({
  children,
  scale = 1.02,
  tapScale = 0.98,
  className,
  ...props
}: ScaleOnHoverProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: tapScale }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
