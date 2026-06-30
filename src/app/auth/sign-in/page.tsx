import Link from "next/link";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Sign in — ListingStudio",
};

export default function SignInPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your ListingStudio account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Suspense>
          <SignInForm />
        </Suspense>
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/sign-up" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
