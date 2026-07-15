declare module "*.css";

declare module "*.md?raw" {
  const content: string;
  export default content;
}

/** Injected by vite define — ISO timestamp of the build. */
declare const __BUILD_TIME__: string;

/** Injected by vite define — true for watch (dev) builds. */
declare const __DEV_BUILD__: boolean;
