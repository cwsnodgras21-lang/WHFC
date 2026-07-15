import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedbackDialog } from "@/components/feedback/feedback-dialog";

describe("FeedbackDialog", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the no-PHI warning and bounded feedback fields", () => {
    render(<FeedbackDialog open onClose={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Send feedback" })
    ).toBeInTheDocument();
    expect(screen.getByText("Do not include patient information")).toBeInTheDocument();
    expect(screen.getByLabelText("Short summary")).toHaveAttribute("maxlength", "160");
    expect(
      screen.getByLabelText("What happened or what would help?")
    ).toHaveAttribute("maxlength", "1000");
  });

  it("shows the Nolturn reference after a successful submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ reference: "FEED-0123", status: "inbox" }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<FeedbackDialog open onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Short summary"), {
      target: { value: "Quantity does not update" },
    });
    fireEvent.change(screen.getByLabelText("What happened or what would help?"), {
      target: { value: "The quantity remains unchanged after scanning an item." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send feedback" }));

    await waitFor(() => {
      expect(screen.getByText(/FEED-0123/)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
