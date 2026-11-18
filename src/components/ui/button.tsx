"use client";
import * as React from "react";
import { Button as AntButton, type ButtonProps } from "antd";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";
import styles from "./controls.module.css";
const buttonVariants = cva(styles.button, {
  variants: {
    variant: {
      default: styles.primary,
      destructive: styles.danger,
      outline: styles.outline,
      secondary: styles.secondary,
      ghost: styles.ghost,
      link: styles.link,
    },
    size: {
      default: styles.normal,
      sm: styles.small,
      lg: styles.large,
      icon: styles.icon,
      "icon-sm": styles.iconSmall,
      "icon-lg": styles.iconLarge,
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type = "button",
  ref,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild)
    return <Slot data-slot="button" className={classes} ref={ref} {...props} />;
  return (
    <AntButton
      data-slot="button"
      data-variant={variant}
      data-size={size}
      ref={(instance) => {
        const el = instance as HTMLButtonElement | null;
        if (typeof ref === "function") ref(el ?? null);
        else if (ref) ref.current = el ?? null;
      }}
      htmlType={type}
      type={
        variant === "default" || variant === "destructive"
          ? "primary"
          : variant === "ghost"
            ? "text"
            : variant === "link"
              ? "link"
              : "default"
      }
      danger={variant === "destructive"}
      size={
        size === "sm" || size === "icon-sm"
          ? "small"
          : size === "lg" || size === "icon-lg"
            ? "large"
            : "middle"
      }
      className={classes}
      {...(props as ButtonProps)}
    />
  );
}
export { Button, buttonVariants };
