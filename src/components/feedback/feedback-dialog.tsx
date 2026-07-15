"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";
import {
  feedbackFormSchema,
  type FeedbackFormValues,
} from "@/lib/validation/feedback";

type FeedbackDialogProps = {
  open: boolean;
  onClose: () => void;
};

const emptyDefaults: FeedbackFormValues = {
  category: "feedback",
  title: "",
  description: "",
  pageUrl: "/",
  browser: {
    browser: "",
    viewport: "",
    locale: "",
  },
};

type FeedbackResponse = {
  error?: string;
  reference?: string;
};

export function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      ...emptyDefaults,
      pageUrl: window.location.pathname,
      browser: {
        browser: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        locale: navigator.language,
      },
    });
  }, [open, reset]);

  if (!open) return null;

  function closeDialog() {
    setServerError(null);
    setReference(null);
    onClose();
  }

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/feedback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const result = (await response.json()) as FeedbackResponse;

        if (!response.ok || !result.reference) {
          setServerError(result.error ?? "Feedback could not be submitted.");
          return;
        }

        setReference(result.reference);
      } catch {
        setServerError("Feedback could not be submitted. Please try again.");
      }
    });
  });

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isPending) closeDialog();
      }}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="feedback-dialog-title" className="modal-title">
              Send feedback
            </h2>
            <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
              Tell Nolturn what is working, what is confusing, or what needs attention.
            </p>
          </div>
          <Button
            type="button"
            variant="icon"
            aria-label="Close feedback form"
            disabled={isPending}
            onClick={closeDialog}
          >
            &times;
          </Button>
        </div>

        {reference ? (
          <div className="modal-body space-y-4">
            <Alert
              variant="success"
              title="Feedback received"
              message={`Your reference is ${reference}. Nolturn will review it.`}
            />
            <div className="flex justify-end">
              <Button type="button" onClick={closeDialog}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="modal-body space-y-4">
              <Alert
                variant="warning"
                title="Do not include patient information"
                message="Do not enter patient names, dates of birth, diagnoses, clinical details, or medical record information. Describe only the application behavior."
              />
              {serverError ? <Alert variant="error" message={serverError} /> : null}

              <FormField
                id="feedback-category"
                label="Feedback type"
                error={errors.category?.message}
              >
                <FormSelect
                  id="feedback-category"
                  disabled={isPending}
                  invalid={Boolean(errors.category)}
                  {...register("category")}
                >
                  <option value="feedback">General feedback</option>
                  <option value="bug">Something is not working</option>
                  <option value="feature">Feature request</option>
                  <option value="question">Question</option>
                </FormSelect>
              </FormField>

              <FormField
                id="feedback-title"
                label="Short summary"
                error={errors.title?.message}
              >
                <FormInput
                  id="feedback-title"
                  placeholder="Example: Quantity does not update after scanning"
                  maxLength={160}
                  disabled={isPending}
                  invalid={Boolean(errors.title)}
                  {...register("title")}
                />
              </FormField>

              <FormField
                id="feedback-description"
                label="What happened or what would help?"
                hint="Application behavior only. Maximum 1,000 characters."
                error={errors.description?.message}
              >
                <textarea
                  id="feedback-description"
                  className={`form-input ${errors.description ? "form-input-invalid" : ""}`}
                  rows={5}
                  maxLength={1_000}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.description)}
                  {...register("description")}
                />
              </FormField>

              <input type="hidden" {...register("pageUrl")} />
              <input type="hidden" {...register("browser.browser")} />
              <input type="hidden" {...register("browser.viewport")} />
              <input type="hidden" {...register("browser.locale")} />
            </div>
            <div className="modal-footer">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={closeDialog}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Sending..." : "Send feedback"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
