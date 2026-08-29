import { redirect } from "next/navigation";

export default function LegacyOAuthClientsPage() {
  redirect("/admin/apps");
}
