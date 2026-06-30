import { BrandBuilder } from "./brand-builder";

export const metadata = { title: "New brand — ListingStudio" };

export default function NewBrandPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create a brand profile</h1>
        <p className="mt-1 text-sm text-muted">
          Every AI-generated listing flows through this profile, so it&apos;s worth getting right.
        </p>
      </div>
      <BrandBuilder />
    </div>
  );
}
