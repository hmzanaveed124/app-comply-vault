"use client";
import * as React from "react";
import { Tooltip as AntTooltip } from "antd";
import { Slot } from "@radix-ui/react-slot";
import type * as Primitive from "@radix-ui/react-tooltip";
const DelayContext = React.createContext(0);
function TooltipProvider({
  delayDuration = 0,
  children,
}: React.ComponentProps<typeof Primitive.Provider>) {
  return (
    <DelayContext.Provider value={delayDuration}>
      {children}
    </DelayContext.Provider>
  );
}
function Tooltip({
  children,
  open,
  defaultOpen,
  onOpenChange,
  delayDuration,
}: React.ComponentProps<typeof Primitive.Root>) {
  const delay = React.useContext(DelayContext);
  const parts = React.Children.toArray(children);
  const content = parts.find(
    (child) => React.isValidElement(child) && child.type === TooltipContent,
  ) as
    | React.ReactElement<React.ComponentProps<typeof Primitive.Content>>
    | undefined;
  const trigger = parts.find(
    (child) => React.isValidElement(child) && child.type === TooltipTrigger,
  ) as React.ReactElement | undefined;
  const side = content?.props.side ?? "top";
  return (
    <AntTooltip
      title={content?.props.children}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      mouseEnterDelay={(delayDuration ?? delay) / 1000}
      placement={side}
      classNames={{ container: content?.props.className }}
    >
      {trigger ?? <span />}
    </AntTooltip>
  );
}
function TooltipTrigger({
  asChild,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  const Comp = asChild ? Slot : "button";
  return <Comp type="button" data-slot="tooltip-trigger" {...props} />;
}
function TooltipContent(
  _props: React.ComponentProps<typeof Primitive.Content>,
) {
  return null;
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
