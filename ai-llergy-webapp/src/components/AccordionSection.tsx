"use client";

import { useState } from "react";

interface AccordionSectionProps {
  title: string;
  count: number;
  variant: "safe" | "caution";
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function AccordionSection({
  title,
  count,
  variant,
  defaultOpen = false,
  children,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`accordion accordion--${variant}`}>
      <button
        className="accordion__header"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        aria-expanded={isOpen}
      >
        <div className="accordion__title-group">
          <span className={`accordion__indicator accordion__indicator--${variant}`} />
          <h3 className="accordion__title">{title}</h3>
          <span className="accordion__count">({count})</span>
        </div>
        <span className={`accordion__chevron ${isOpen ? "accordion__chevron--open" : ""}`}>
          ›
        </span>
      </button>
      <div
        className={`accordion__content ${isOpen ? "accordion__content--open" : ""}`}
        aria-hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}
