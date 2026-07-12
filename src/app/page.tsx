import { BrandLogo } from "@/components/brand/brand-logo";
import { getSessionUser } from "@/lib/auth/session";
import { brandLogoFileExists } from "@/lib/brand/logo";
import { LinkButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default async function HomePage() {
  const user = await getSessionUser();
  const logoAvailable = brandLogoFileExists();

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md card-body space-y-5">
        <BrandLogo variant="auth" logoAvailable={logoAvailable} />
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-xl font-extrabold text-[var(--color-fg)]">
            Clinic consumable inventory
          </h1>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Track gloves, paper products, cleaning supplies, and other
            consumables for White House Family Care.
          </p>
        </div>
        <Alert
          variant="warning"
          message="This system does not collect, store, or process protected health information or patient data."
        />
        <div>
          {user ? (
            <LinkButton href="/dashboard" variant="primary">
              Open dashboard
            </LinkButton>
          ) : (
            <LinkButton href="/login" variant="primary">
              Sign in
            </LinkButton>
          )}
        </div>
      </div>
    </main>
  );
}
