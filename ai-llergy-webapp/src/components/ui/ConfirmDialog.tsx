"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** When set, user must type this string exactly to enable confirm. */
  confirmPhrase?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  confirmPhrase,
  loading,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const phraseOk = !confirmPhrase || typed === confirmPhrase;

  const handleClose = () => {
    setTyped("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={!phraseOk}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description && (
        <div className="text-sm text-text-muted">{description}</div>
      )}
      {confirmPhrase && (
        <div className="mt-4">
          <p className="text-sm text-text mb-2">
            Type{" "}
            <span className="font-semibold text-text">{confirmPhrase}</span> to
            confirm:
          </p>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={destructive}
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
