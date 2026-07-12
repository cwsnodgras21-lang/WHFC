import { Alert } from "@/components/ui/alert";

type ErrorStateProps = {
  title?: string;
  message: string;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  className,
}: ErrorStateProps) {
  return (
    <Alert variant="error" title={title} message={message} className={className} />
  );
}
