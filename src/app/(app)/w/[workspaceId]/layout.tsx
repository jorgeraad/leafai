import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getIntegration } from "@/lib/db"
import { WorkspaceShell } from "./workspace-shell"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Verify user is a member of this workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .limit(1)
    .single()

  if (!membership) {
    redirect("/login")
  }

  const integration = await getIntegration(user.id, workspaceId, "google_drive")
  const hasGoogleDrive = integration?.status === "active"

  return <WorkspaceShell workspaceId={workspaceId} hasGoogleDrive={hasGoogleDrive}>{children}</WorkspaceShell>
}
