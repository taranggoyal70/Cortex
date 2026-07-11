import { CreateOrganization } from "@clerk/nextjs";
import { BrainIcon } from "@phosphor-icons/react/dist/ssr";

export function CreateWorkspacePrompt() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <BrainIcon size={40} weight="duotone" className="text-accent-light" />
        <h1 className="mt-5 text-2xl font-semibold text-paper">
          Create your company workspace
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          A workspace is your company&apos;s brain — its own isolated sources,
          skills, and skills file. Create one to get started.
        </p>
        <div className="mt-8">
          <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
        </div>
      </div>
    </main>
  );
}
