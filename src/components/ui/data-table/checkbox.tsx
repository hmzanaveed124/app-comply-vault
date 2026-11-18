"use client";
import { Checkbox as AntCheckbox } from "antd";
export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  indeterminate?: boolean;
  label?: string;
  className?: string;
  id?: string;
  "aria-label"?: string;
  /** Associates an external message (e.g. a form error) with the control. */
  "aria-describedby"?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  ...props
}: CheckboxProps) {
  return (
    <AntCheckbox
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      {...props}
    >
      {label}
    </AntCheckbox>
  );
}
