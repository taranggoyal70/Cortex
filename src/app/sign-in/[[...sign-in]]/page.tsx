import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4 py-12">
      <div className="flex flex-col items-center gap-8">
        <Brand />
        <SignIn />
      </div>
    </main>
  );
}
