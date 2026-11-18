"use client";
import * as React from "react";
import { Tabs as AntTabs } from "antd";
type Variant = "underline" | "segment";
type Descriptor = {
  children?: React.ReactNode;
  value: string;
  className?: string;
  indicatorClassName?: string;
};
function collect(
  children: React.ReactNode,
  type: React.ElementType,
): React.ReactElement<Descriptor>[] {
  return React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<Descriptor>(child)
      ? child.type === type
        ? [child]
        : collect(child.props.children, type)
      : [],
  );
}
export function Tabs({
  defaultValue,
  value,
  onValueChange,
  variant = "underline",
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  const panels = collect(children, TabsContent);
  const triggers = collect(children, TabsTrigger);
  const extras = React.Children.toArray(children).filter(
    (child) =>
      !React.isValidElement(child) ||
      (child.type !== TabsList && child.type !== TabsContent),
  );
  return (
    <>
      <AntTabs
        className={className}
        activeKey={value}
        defaultActiveKey={defaultValue}
        onChange={onValueChange}
        type={variant === "segment" ? "card" : "line"}
        renderTabBar={(props, DefaultTabBar) => (
          <>
            <DefaultTabBar {...props} />
            {extras}
          </>
        )}
        items={triggers.map((trigger) => {
          const panel = panels.find(
            (p) => p.props.value === trigger.props.value,
          );
          return {
            key: trigger.props.value,
            label: (
              <span className={trigger.props.className}>
                {trigger.props.children}
              </span>
            ),
            children: (
              <div className={panel?.props.className}>
                {panel?.props.children}
              </div>
            ),
            forceRender: true,
          };
        })}
      />
    </>
  );
}
export function TabsList(_props: {
  children: React.ReactNode;
  className?: string;
}) {
  return null;
}
export function TabsTrigger(_props: Descriptor) {
  return null;
}
export function TabsContent(_props: Descriptor) {
  return null;
}
