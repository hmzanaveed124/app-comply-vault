/** Bulk deletion is retired: it bypassed tenant isolation and preservation. */
export async function DELETE(): Promise<Response> {
  return Response.json(
    {
      error:
        "Bulk deletion is disabled. Records must follow the approved retention and legal-hold process.",
    },
    { status: 410 },
  );
}
