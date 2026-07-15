// Minimal stub of the obsidian runtime API for use in vitest.
// Only the symbols imported by code-under-test need to exist; nothing more.
// If a test ever invokes one of these, we want a loud failure rather than a
// silent no-op, hence the throw.

import { parse } from "yaml";

const notImplemented = (name: string) => () => {
  throw new Error(`[obsidian mock] ${name} is not implemented for unit tests`);
};

// Obsidian's parseYaml is js-yaml under the hood; the `yaml` package is a
// close-enough stand-in for the flat `key: value` subset the plugin accepts.
export const parseYaml = (source: string): unknown => parse(source);
export const stringifyYaml = notImplemented("stringifyYaml");

export class App {}
export class TFile {}
export class Vault {}
export class TFolder {}
export class TAbstractFile {}
export class Component {}
export class Plugin {}
export class PluginSettingTab {}
export class MarkdownRenderChild {
  containerEl: unknown;
  constructor(containerEl: unknown) {
    this.containerEl = containerEl;
  }
}
export class Modal {}
export class Setting {}
export class Notice {
  constructor(_message: string) {}
}
export const MarkdownRenderer = {
  render: notImplemented("MarkdownRenderer.render"),
};
export const normalizePath = (p: string) => p.replaceAll(/\/+/gu, "/").replace(/^\/+/u, "");
export const Platform = {
  isMobile: false,
  isMobileApp: false,
};
