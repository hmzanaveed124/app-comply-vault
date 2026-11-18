import { notFound } from "next/navigation";
import { JourneyPreview } from "./preview";
export const dynamic = "force-dynamic";
/** Sample-only review surface. Never available on production deployments. */
export default function JourneyPreviewPage() {
  if (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.NODE_ENV !== "development"
  )
    notFound();
  return <JourneyPreview />;
}
