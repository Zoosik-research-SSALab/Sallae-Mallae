"use client";

import { motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  scale?: number;
  style?: CSSProperties;
};

export default function Reveal({ children, className, delay = 0, y = 36, scale = 1, style }: Props) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, scale: scale === 1 ? 1 : scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
