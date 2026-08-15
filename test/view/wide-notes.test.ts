import { afterEach, describe, expect, it, vi } from "vitest";
import { WideNoteManager } from "src/view/wide-notes";

describe("WideNoteManager", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("recognizes the embedded Base wrapper before its view renders", () => {
    const classes = new Set<string>();
    const pane = {
      classList: {
        toggle: (name: string, force: boolean) => {
          if (force) classes.add(name);
          else classes.delete(name);
          return force;
        },
      },
      querySelector: (selector: string) =>
        selector.includes(".bases-embed") ? ({} as Element) : null,
    } as unknown as HTMLElement;
    const plugin = {
      app: {
        workspace: {
          getLeavesOfType: () => [],
        },
      },
      settings: { wideNotes: true },
    };
    vi.stubGlobal("document", {
      querySelectorAll: () => [pane],
    });

    const manager = new WideNoteManager(plugin as never);
    manager.recomputeAll();

    expect(classes.has("aib-wide")).toBe(true);
  });

  it("keeps a note wide when its infobox is virtualized out of the DOM", () => {
    const classes = new Set<string>();
    const classList = {
      remove: (name: string) => classes.delete(name),
      toggle: (name: string, force: boolean) => {
        if (force) classes.add(name);
        else classes.delete(name);
        return force;
      },
    };
    const pane = {
      classList,
      querySelector: () => null,
    } as unknown as HTMLElement;
    const fromEl = {
      closest: () => pane,
    } as unknown as HTMLElement;
    let currentPath = "Character.md";
    const plugin = {
      app: {
        workspace: {
          getLeavesOfType: () => [
            {
              view: {
                containerEl: { contains: () => true },
                file: {
                  get path() {
                    return currentPath;
                  },
                },
              },
            },
          ],
        },
      },
      settings: { wideNotes: true },
    };
    vi.stubGlobal("document", {
      querySelectorAll: () => [pane],
    });

    const manager = new WideNoteManager(plugin as never);
    manager.recompute(fromEl, currentPath);
    manager.recomputeAll();

    expect(classes.has("aib-wide")).toBe(true);

    currentPath = "Ordinary note.md";
    manager.recomputeAll();

    expect(classes.has("aib-wide")).toBe(false);
  });
});
