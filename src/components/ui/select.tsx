"use client";
import * as React from "react";
import { Select as AntSelect } from "antd";
import type * as Primitive from "@radix-ui/react-select";
import { cn } from "~/lib/utils";

type NodeProps = {
  children?: React.ReactNode;
  value?: string;
  disabled?: boolean;
  textValue?: string;
  placeholder?: React.ReactNode;
  className?: string;
  size?: "sm" | "default";
  id?: string;
};
// Read the existing compound syntax as declarative options, avoiding page-by-page changes.
function walk(
  children: React.ReactNode,
  match: React.ElementType,
): React.ReactElement<NodeProps>[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<NodeProps>(child)) return [];
    return child.type === match ? [child] : walk(child.props.children, match);
  });
}
function Select({
  children,
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  name,
  required,
  ...rest
}: React.ComponentProps<typeof Primitive.Root>) {
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value === undefined ? internal : value;
  const selectRef = React.useRef<React.ComponentRef<typeof AntSelect>>(null);
  const trigger = walk(children, SelectTrigger)[0];
  const placeholder = walk(trigger?.props.children, SelectValue)[0]?.props
    .placeholder;
  const items = walk(children, SelectItem);
  return (
    <>
      <AntSelect
        ref={selectRef}
        data-slot="select"
        value={current}
        onChange={(next) => {
          setInternal(next);
          onValueChange?.(next);
        }}
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        disabled={disabled}
        id={trigger?.props.id}
        aria-required={required}
        aria-label={(trigger?.props as React.AriaAttributes)?.["aria-label"]}
        size={trigger?.props.size === "sm" ? "small" : "middle"}
        className={cn("w-full", trigger?.props.className)}
        placeholder={placeholder}
        options={items.map((item) => ({
          value: item.props.value!,
          label: item.props.children,
          disabled: item.props.disabled,
          title: item.props.textValue,
        }))}
        optionFilterProp="title"
        {...(rest.dir ? { direction: rest.dir } : {})}
      />
      {name && (
        <select
          name={name}
          value={current ?? ""}
          required={required}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          onInvalid={(event) => {
            event.preventDefault();
            selectRef.current?.focus();
          }}
          onChange={(event) => {
            setInternal(event.target.value);
            onValueChange?.(event.target.value);
          }}
        >
          <option value="" />
          {items.map((item) => (
            <option
              key={item.props.value}
              value={item.props.value}
              disabled={item.props.disabled}
            >
              {item.props.textValue ?? String(item.props.children)}
            </option>
          ))}
        </select>
      )}
    </>
  );
}
// These elements are descriptors consumed by Select; they do not render independently.
function SelectTrigger(
  _props: React.ComponentProps<typeof Primitive.Trigger> & {
    size?: "sm" | "default";
  },
) {
  return null;
}
function SelectValue(_props: React.ComponentProps<typeof Primitive.Value>) {
  return null;
}
function SelectContent(_props: React.ComponentProps<typeof Primitive.Content>) {
  return null;
}
function SelectItem(_props: React.ComponentProps<typeof Primitive.Item>) {
  return null;
}
function SelectGroup(_props: React.ComponentProps<typeof Primitive.Group>) {
  return null;
}
function SelectLabel(_props: React.ComponentProps<typeof Primitive.Label>) {
  return null;
}
function SelectSeparator(
  _props: React.ComponentProps<typeof Primitive.Separator>,
) {
  return null;
}
function SelectScrollUpButton(
  _props: React.ComponentProps<typeof Primitive.ScrollUpButton>,
) {
  return null;
}
function SelectScrollDownButton(
  _props: React.ComponentProps<typeof Primitive.ScrollDownButton>,
) {
  return null;
}
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
