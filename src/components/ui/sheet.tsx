"use client";
import * as React from "react";
import { Drawer } from "antd";
import type * as Primitive from "@radix-ui/react-dialog";
import {
  Dialog as Sheet,
  DialogTrigger as SheetTrigger,
  DialogClose as SheetClose,
  DialogTitle as SheetTitle,
  DialogDescription as SheetDescription,
  useDialog,
} from "./dialog";
import { cn } from "~/lib/utils";
function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content> & {
  side?: "left" | "right" | "top" | "bottom";
}) {
  const { open, setOpen, titleId, descriptionId } = useDialog();
  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      placement={side}
      size={side === "left" ? "var(--cv-sidebar-width)" : 384}
      destroyOnHidden
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      styles={{ body: { padding: 0 } }}
      classNames={{ section: className }}
    >
      <div
        data-slot="sheet-content"
        className="flex h-full flex-col gap-4"
        {...props}
      >
        {children}
      </div>
    </Drawer>
  );
}
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
