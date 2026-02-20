"use client";

import { useState } from "react";

interface MenuItemProps {
  name: string;
  price: number;
  ingredients: string;
  warning?: string;
}

export default function MenuItem({
  name,
  price,
  ingredients,
  warning,
}: MenuItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`menu-item ${warning ? "menu-item--caution" : ""}`}>
      <div className="menu-item__header">
        <h4 className="menu-item__name">{name}</h4>
        <div className="menu-item__header-right">
          <span className="menu-item__price">${price}</span>
          <button
            type="button"
            className={`menu-item__toggle ${isExpanded ? "menu-item__toggle--open" : ""}`}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Hide ingredients" : "Show ingredients"}
          >
            ›
          </button>
        </div>
      </div>
      <div
        className={`menu-item__ingredients-wrapper ${isExpanded ? "menu-item__ingredients-wrapper--open" : ""}`}
        aria-hidden={!isExpanded}
      >
        <p className="menu-item__ingredients">{ingredients}</p>
      </div>
      {warning && (
        <p className="menu-item__warning">
          <span className="menu-item__warning-icon">!</span>
          {warning}
        </p>
      )}
    </div>
  );
}
