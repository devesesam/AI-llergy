"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Trash2, Tags, X } from "lucide-react";
import { Button, Modal, ConfirmDialog } from "@/components/ui";
import { ALL_FILTERS } from "@/lib/allergens";
import { cn } from "@/lib/cn";

interface MenuBulkBarProps {
  count: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onSetAllergens: (allergenIds: string[], mode: "add" | "remove") => void;
  onClear: () => void;
}

export function MenuBulkBar({
  count,
  onActivate,
  onDeactivate,
  onDelete,
  onSetAllergens,
  onClear,
}: MenuBulkBarProps) {
  const [allergenModal, setAllergenModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apply = (mode: "add" | "remove") => {
    onSetAllergens([...picked], mode);
    setAllergenModal(false);
    setPicked(new Set());
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5"
      >
        <span className="text-sm font-medium text-text">
          {count} selected
        </span>
        <div className="h-5 w-px bg-border mx-1" />
        <Button variant="secondary" size="sm" onClick={onActivate} icon={<Eye className="w-4 h-4" />}>
          Activate
        </Button>
        <Button variant="secondary" size="sm" onClick={onDeactivate} icon={<EyeOff className="w-4 h-4" />}>
          Deactivate
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setAllergenModal(true)}
          icon={<Tags className="w-4 h-4" />}
        >
          Set free-from
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          icon={<Trash2 className="w-4 h-4" />}
          className="text-danger"
        >
          Delete
        </Button>
        <button
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </motion.div>

      <Modal
        open={allergenModal}
        onClose={() => setAllergenModal(false)}
        title={`Set free-from flags for ${count} items`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => apply("remove")}
              disabled={picked.size === 0}
            >
              Remove from selected
            </Button>
            <Button onClick={() => apply("add")} disabled={picked.size === 0}>
              Add to selected
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted mb-3">
          Choose the allergens, then add or remove them across all selected
          dishes.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_FILTERS.map((a) => {
            const on = picked.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => togglePick(a.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  on
                    ? "bg-primary/15 border-primary/40 text-[#9a7400]"
                    : "bg-surface border-border text-text-muted hover:border-text-muted/50"
                )}
              >
                <span>{a.icon}</span>
                {a.label}
              </button>
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setConfirmDelete(false);
        }}
        title="Delete selected items"
        destructive
        confirmLabel={`Delete ${count} items`}
        description={
          <>
            Remove {count} selected {count === 1 ? "dish" : "dishes"} from the
            menu? You&apos;ll still need to Save to make it permanent.
          </>
        }
      />
    </>
  );
}
