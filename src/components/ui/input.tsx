"use client";
import * as React from "react";
import { Input as AntInput } from "antd";
import { cn } from "~/lib/utils";
import styles from "./controls.module.css";
function Input({
  className,
  type,
  ref,
  size,
  ...props
}: React.ComponentProps<"input">) {
  // File inputs must remain native to support browser upload behaviour.
  if (type === "file")
    return (
      <input
        data-slot="input"
        type={type}
        ref={ref}
        className={cn(styles.input, className)}
        size={size}
        {...props}
      />
    );
  return (
    <AntInput
      data-slot="input"
      type={type}
      htmlSize={size}
      className={cn(styles.input, className)}
      ref={(instance) => {
        const el = instance?.input ?? null;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      {...props}
    />
  );
}
export { Input };
