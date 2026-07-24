import { describe, expect, it, vi } from "vitest";
import { createServer } from "./server.js";
import { runCli } from "./main.js";

vi.mock("./server.js", () => ({
  createServer: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("--version flag", () => {
  it("prints the package version and artifact data_version, and never starts the server", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runCli(["--version"]);

    expect(createServer).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledTimes(1);
    const [line] = logSpy.mock.calls[0] as [string];
    expect(line).toMatch(
      /^finops-framework-mcp v\d+\.\d+\.\d+ \(data v\d+\.\d+\.\d+\)$/,
    );
    logSpy.mockRestore();
  });

  it("is filtered from positional artifact-dir handling like --experimental", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    // If --version were treated as the positional artifact-dir argument,
    // loadArtifact would throw trying to read "--version" as a directory
    // instead of resolving to the default data/framework artifact.
    await expect(
      runCli(["--version", "--experimental"]),
    ).resolves.toBeUndefined();
    logSpy.mockRestore();
  });
});
