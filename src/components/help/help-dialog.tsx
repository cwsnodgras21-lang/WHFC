"use client";

import { HELP_TOPICS, type HelpTopicKey } from "@/lib/help/content";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type HelpDialogProps = {
  topic: HelpTopicKey;
  onClose: () => void;
};

export function HelpDialog({ topic, onClose }: HelpDialogProps) {
  const content = HELP_TOPICS[topic];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-dialog-title"
      >
        <div className="modal-header">
          <h2 id="help-dialog-title" className="modal-title">
            {content.title}
          </h2>
          <Button type="button" variant="icon" aria-label="Close" onClick={onClose}>
            ×
          </Button>
        </div>
        <div className="modal-body space-y-4 text-sm">
          <p>{content.purpose}</p>

          <div>
            <h3 className="mb-1 font-medium">What you can do here</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-[var(--color-fg-muted)]">
              {content.whatYouCanDo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          {content.requiredFields?.length ? (
            <div>
              <h3 className="mb-1 font-medium">Required fields</h3>
              <ul className="list-disc space-y-0.5 pl-5 text-[var(--color-fg-muted)]">
                {content.requiredFields.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h3 className="mb-1 font-medium">Step by step</h3>
            <ol className="list-decimal space-y-0.5 pl-5 text-[var(--color-fg-muted)]">
              {content.steps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>

          {content.commonMistakes.length > 0 ? (
            <Alert
              variant="warning"
              title="Common mistakes"
              message={content.commonMistakes.join(" · ")}
            />
          ) : null}

          {content.roleNotes ? (
            <p className="text-xs text-[var(--color-fg-muted)]">
              <span className="font-medium">Access: </span>
              {content.roleNotes}
            </p>
          ) : null}
        </div>
        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
