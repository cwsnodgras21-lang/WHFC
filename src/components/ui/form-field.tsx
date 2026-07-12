import { cn } from "@/lib/cn";

type FormFieldProps = {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({
  id,
  label,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-0", className)}>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="mt-1.5 form-hint">{hint}</p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function FormInput({ className, invalid, ...props }: FormInputProps) {
  return (
    <input
      className={cn("form-input", invalid && "form-input-invalid", className)}
      {...props}
    />
  );
}

type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export function FormSelect({
  className,
  invalid,
  children,
  ...props
}: FormSelectProps) {
  return (
    <select
      className={cn("form-select", invalid && "form-input-invalid", className)}
      {...props}
    >
      {children}
    </select>
  );
}

type FormSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

/** Grouped block of related fields with an optional heading. */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("form-section", className)}>
      {title || description ? (
        <div>
          {title ? <h3 className="form-section-title">{title}</h3> : null}
          {description ? (
            <p className="form-section-desc">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
