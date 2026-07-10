import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-4 py-12">
      <div className="flex flex-col items-center gap-8">
        <Brand />
        <SignUp />
      </div>
    </main>
  );
}
