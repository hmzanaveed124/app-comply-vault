"use client";
import { App, Button } from "antd";
import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { dismissToast, subscribe } from "~/lib/toast-store";
/** Preserve the existing toast API while rendering themed Ant notifications. */
export function Toaster(): null {
  const { notification } = App.useApp();
  const active = useRef(new Set<string>());
  useEffect(() => {
    const unsubscribe = subscribe((toasts) => {
      const next = new Set(toasts.map((toast) => toast.id));
      for (const key of active.current)
        if (!next.has(key)) notification.destroy(key);
      for (const toast of toasts) {
        notification.open({
          key: toast.id,
          title: toast.title,
          description: toast.description,
          type:
            toast.status === "error" ||
            toast.status === "success" ||
            toast.status === "info"
              ? toast.status
              : undefined,
          icon:
            toast.icon ??
            (toast.status === "loading" ? (
              <LoaderCircle className="animate-spin" size={20} />
            ) : undefined),
          placement: "bottomRight",
          duration: 0,
          closable: toast.dismissible,
          onClose: () => dismissToast(toast.id),
          actions: toast.action ? (
            <Button onClick={() => toast.action?.onClick(toast)}>
              {toast.action.label}
            </Button>
          ) : undefined,
        });
      }
      active.current = next;
    });
    return () => {
      unsubscribe();
      for (const key of active.current) notification.destroy(key);
      active.current.clear();
    };
  }, [notification]);
  return null;
}
