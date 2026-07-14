"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
};

type ConfirmApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const pendingRef = useRef<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve(value);
  }, []);

  const api = useMemo<ConfirmApi>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {pending ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) settle(false);
          }}
        >
          <div
            className="modal-panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-message"
          >
            <div className="modal-header">
              <h2 id="confirm-dialog-title" className="modal-title">
                {pending.title}
              </h2>
            </div>
            <div className="modal-body">
              <p
                id="confirm-dialog-message"
                className="text-sm text-[var(--color-fg-muted)]"
              >
                {pending.message}
              </p>
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => settle(false)}
              >
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant={pending.destructive ? "destructive" : "primary"}
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

/**
 * Uses the ConfirmProvider when available; falls back to `window.confirm`
 * so components remain usable in unit tests without a provider.
 */
export function useConfirm(): ConfirmApi {
  const context = useContext(ConfirmContext);
  if (context) return context;

  return {
    confirm: async ({ title, message }) => {
      if (typeof window === "undefined") return false;
      return window.confirm(`${title}\n\n${message}`);
    },
  };
}
