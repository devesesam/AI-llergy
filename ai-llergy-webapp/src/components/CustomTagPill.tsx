"use client";

import { CustomTag } from "@/lib/allergens";

interface CustomTagPillProps {
  tag: CustomTag;
  onRemove: (tagId: string) => void;
}

export default function CustomTagPill({ tag, onRemove }: CustomTagPillProps) {
  return (
    <span className="custom-tag">
      <span className="custom-tag__icon">🏷️</span>
      <span className="custom-tag__label">{tag.displayLabel}</span>
      <button
        type="button"
        className="custom-tag__remove"
        onClick={() => onRemove(tag.id)}
        aria-label={`Remove ${tag.displayLabel}`}
      >
        ×
      </button>
    </span>
  );
}
