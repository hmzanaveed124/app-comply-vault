import { z } from "zod";

export const contextualControlSchema = z.object({
  applicability: z.string().trim().min(20).max(2000),
  triggerKeywords: z.array(z.string().trim().min(2).max(100)).min(1).max(30),
  evidenceRequirements: z.string().trim().min(20).max(3000),
  policyBasis: z.string().trim().min(10).max(2000),
  exceptions: z.string().trim().min(10).max(2000),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(value))),
});
export type ContextualControl = z.infer<typeof contextualControlSchema>;
export function parseContextualControl(
  value: unknown,
): ContextualControl | null {
  const result = contextualControlSchema.safeParse(value);
  return result.success ? result.data : null;
}
export function controlMatchesRecommendation(
  control: ContextualControl,
  text: string,
  date = new Date(),
): boolean {
  return (
    new Date(control.effectiveDate) <= date &&
    control.triggerKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase()),
    )
  );
}
