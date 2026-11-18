import { notFound } from "next/navigation";
import { ThemeShowcase } from "./showcase";
export default function ThemePreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <ThemeShowcase />;
}
