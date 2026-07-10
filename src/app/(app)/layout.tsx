import { AppSidebar } from "@/components/app-sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen bg-ink">
      <AppSidebar />
      <div className="min-h-screen lg:pl-[240px]">{children}</div>
    </div>
  );
}
