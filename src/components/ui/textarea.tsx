"use client";
import * as React from "react";
import { Input } from "antd";
import { cn } from "~/lib/utils";
import styles from "./controls.module.css";
function Textarea({
  className,
  ref,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Input.TextArea
      data-slot="textarea"
      className={cn(styles.textarea, className)}
      ref={(instance) => {
        const el = instance?.resizableTextArea?.textArea ?? null;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      {...props}
    />
  );
}
export { Textarea };
