"use client";
import * as React from "react";
import { Modal } from "antd";
import { Slot } from "@radix-ui/react-slot";
import type * as Primitive from "@radix-ui/react-dialog";
import { cn } from "~/lib/utils";
import styles from "./overlays.module.css";
const DialogContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
} | null>(null);
export function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("Dialog components require Dialog");
  return context;
}
function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}: React.ComponentProps<typeof Primitive.Root>) {
  const [internal, setInternal] = React.useState(defaultOpen);
  const id = React.useId();
  return (
    <DialogContext.Provider
      value={{
        open: open ?? internal,
        setOpen(next) {
          if (open === undefined) setInternal(next);
          onOpenChange?.(next);
        },
        titleId: `${id}-title`,
        descriptionId: `${id}-description`,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}
function DialogTrigger({
  asChild,
  onClick,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  const context = useDialog();
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type="button"
      aria-haspopup="dialog"
      aria-expanded={context.open}
      data-slot="dialog-trigger"
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) context.setOpen(true);
      }}
    />
  );
}
function DialogClose({
  asChild,
  onClick,
  ...props
}: React.ComponentProps<typeof Primitive.Close>) {
  const context = useDialog();
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type="button"
      data-slot="dialog-close"
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) context.setOpen(false);
      }}
    />
  );
}
function findTitle(children: React.ReactNode): React.ReactNode {
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement<{ children?: React.ReactNode }>(child)) continue;
    if (child.type === DialogTitle) return child.props.children;
    const title = findTitle(child.props.children);
    if (title) return title;
  }
  return null;
}
function DialogContent({
  className,
  children,
  showCloseButton = true,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  onOpenAutoFocus,
  onCloseAutoFocus,
  forceMount,
  ...props
}: React.ComponentProps<typeof Primitive.Content> & {
  showCloseButton?: boolean;
}) {
  const context = useDialog();
  return (
    <Modal
      open={context.open}
      onCancel={(e) => {
        const event = e.nativeEvent;
        if (event instanceof KeyboardEvent) onEscapeKeyDown?.(event);
        else if (
          event instanceof MouseEvent &&
          event.target === event.currentTarget
        ) {
          // Existing call sites do not use Radix's outside-interaction callbacks.
        }
        if (!e.defaultPrevented && !event.defaultPrevented)
          context.setOpen(false);
      }}
      footer={null}
      title={<span className="sr-only">{findTitle(children) ?? "Dialog"}</span>}
      closable={showCloseButton}
      centered
      width={512}
      destroyOnHidden={!forceMount}
      forceRender={!!forceMount}
      aria-labelledby={context.titleId}
      aria-describedby={context.descriptionId}
      styles={{ header: { height: 0, margin: 0, padding: 0 } }}
      classNames={{
        container: cn(styles.dialogContent, className),
        body: styles.dialogBody,
      }}
    >
      <div data-slot="dialog-content" {...props}>
        {children}
      </div>
    </Modal>
  );
}
function DialogPortal({
  children,
}: React.ComponentProps<typeof Primitive.Portal>) {
  return <>{children}</>;
}
function DialogOverlay(_props: React.ComponentProps<typeof Primitive.Overlay>) {
  return null;
}
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(styles.header, className)}
      {...props}
    />
  );
}
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(styles.footer, className)}
      {...props}
    />
  );
}
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Title>) {
  const { titleId } = useDialog();
  return (
    <h2
      id={titleId}
      data-slot="dialog-title"
      className={cn(styles.title, className)}
      {...props}
    />
  );
}
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Description>) {
  const { descriptionId } = useDialog();
  return (
    <p
      id={descriptionId}
      data-slot="dialog-description"
      className={cn(styles.description, className)}
      {...props}
    />
  );
}
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
