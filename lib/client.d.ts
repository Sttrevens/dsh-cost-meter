/**
 * dsh-cost-meter — client half type surface.
 *
 * The browser bundle is consumed by the shell module loader, not imported as
 * TypeScript, so this file documents the plugin's client contract only.
 */

import type { Context } from "@deepseek-ai/cordis";

/** Client plugin body: registers the cost badge into the session-header utilities slot. */
export function apply(ctx: Context): void;
/** Client services the plugin requires. */
export const inject: string[];
