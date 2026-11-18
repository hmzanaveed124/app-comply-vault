"use client";
import * as React from "react";
import { Radio } from "antd";
import type * as Primitive from "@radix-ui/react-radio-group";
import { cn } from "~/lib/utils";
function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  disabled,
  name,
  required,
  orientation,
  dir,
  ref,
  onChange,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Radio.Group
      ref={ref}
      value={value}
      defaultValue={defaultValue}
      onChange={(event) => onValueChange?.(String(event.target.value))}
      disabled={disabled}
      name={name}
      aria-required={required}
      orientation={orientation}
      className={cn("grid gap-3", className)}
      {...props}
    >
      {children}
    </Radio.Group>
  );
}
function RadioGroupItem({
  value,
  id,
  disabled,
  required,
  className,
  ref,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Radio
      value={value}
      id={id}
      disabled={disabled}
      required={required}
      className={className}
      aria-describedby={props["aria-describedby"]}
    />
  );
}
export { RadioGroup, RadioGroupItem };
