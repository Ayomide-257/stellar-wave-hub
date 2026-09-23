import { projectsCol } from "@/lib/db";
import { getAuthUser, canModerateProject } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthUser(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ref = projectsCol.ref.doc(id);
  const doc = await ref.get();
  if (!doc.exists) return Response.json({ error: "Project not found" }, { status: 404 });

  const project = doc.data()!;
  if (project.status !== "submitted") {
    return Response.json(
      { error: "Project is not pending review" },
      { status: 400 },
    );
  }

  const canModerate = await canModerateProject(
    auth.userId,
    auth.role,
    project.category,
  );
  if (!canModerate) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    await ref.update({
      status: "rejected",
      rejection_reason: body.reason || null,
      updated_at: new Date().toISOString(),
    });
    const updated = await ref.get();
    return Response.json({ project: { ...updated.data(), id: updated.data()!.numericId } });
  } catch (err) {
    console.error("Reject error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
