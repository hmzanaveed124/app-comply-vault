"use client";
import * as React from "react";
import { Divider } from "antd";
import type * as Primitive from "@radix-ui/react-separator";
function Separator({
  orientation = "horizontal",
  decorative = true,
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Divider
      ref={(instance) => {
        const el = instance?.nativeElement ?? null;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      data-slot="separator"
      type={orientation}
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={className}
      style={{ margin: 0 }}
      {...props}
    />
  );
}
export { Separator };
