"use client";
import { Alert as AntAlert } from "antd";
import styles from "./controls.module.css";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const alertVariants = cva(styles.alertContent, {
  variants: { variant: { default: "", destructive: styles.alertDanger } },
  defaultVariants: { variant: "default" },
});

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <AntAlert
      data-slot="alert"
      role="alert"
      type={variant === "destructive" ? "error" : "info"}
      showIcon={false}
      className={className}
      description={
        <div className={alertVariants({ variant })}>{props.children}</div>
      }
      {...Object.fromEntries(
        Object.entries(props).filter(([key]) => key !== "children"),
      )}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
