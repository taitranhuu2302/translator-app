import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClipboard = {
  readText: vi.fn(),
  readHTML: vi.fn(),
  readRTF: vi.fn(),
  writeText: vi.fn(),
  readImage: vi.fn(),
  clear: vi.fn(),
  writeImage: vi.fn(),
  write: vi.fn(),
};

vi.mock("electron", () => ({
  clipboard: mockClipboard,
  nativeImage: {
    createFromDataURL: vi.fn(),
  },
}));

describe("SelectionCaptureService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClipboard.readImage.mockReturnValue({ isEmpty: () => true });
  });

  it("captures text from HTML-only clipboard content", async () => {
    let clipboardText = "";
    let clipboardHtml = "";
    let clipboardRtf = "";

    mockClipboard.writeText.mockImplementation((value: string) => {
      clipboardText = value;
    });
    mockClipboard.readText.mockImplementation(() => clipboardText);
    mockClipboard.readHTML.mockImplementation(() => clipboardHtml);
    mockClipboard.readRTF.mockImplementation(() => clipboardRtf);

    const { SelectionCaptureService } = await import(
      "../main/selection/selection-capture-service"
    );

    const simulateCopyShortcut = vi.fn().mockImplementation(async () => {
      clipboardHtml = "<div>Hello <strong>world</strong><br/>Again</div>";
    });

    const service = new SelectionCaptureService(
      {
        simulateCopyShortcut,
        simulatePasteShortcut: vi.fn().mockResolvedValue(undefined),
      },
      {
        snapshot: vi.fn().mockReturnValue({
          text: "existing clipboard",
          html: "",
          rtf: "",
          hasImage: false,
        }),
        restore: vi.fn(),
      } as any,
    );

    const text = await service.captureSelectedText({
      delayMs: 10,
      restoreClipboard: false,
    });

    expect(text).toBe("Hello world\nAgain");
  });
});
