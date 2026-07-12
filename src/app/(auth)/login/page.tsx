import { BrandLogo } from "@/components/brand/brand-logo";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";
import { brandLogoFileExists } from "@/lib/brand/logo";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirect ?? "/dashboard";
  const logoAvailable = brandLogoFileExists();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandLogo variant="auth" logoAvailable={logoAvailable} />
          <h1 className="mt-6 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-[var(--color-fg)]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Clinic staff access only
          </p>
        </div>

        <div className="card card-body">
          <LoginForm redirectTo={redirectTo} />
        </div>

        <div className="mt-5">
          <Alert
            variant="info"
            message="Accounts are provisioned by an administrator. This system does not store patient information."
          />
        </div>
      </div>

      {/* Thin brand rule anchors the sign-in card to the WHFC identity */}
      <div aria-hidden className="brand-rule-x mt-10 w-full max-w-md rounded-full" />
    </main>
  );
}
