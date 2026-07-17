import type { Headscale } from "~/server/headscale/api";

export abstract class Integration<T> {
  protected context: NonNullable<T>;
  constructor(context: T) {
    if (!context) {
      throw new Error("缺少集成上下文");
    }

    this.context = context;
  }

  abstract isAvailable(): Promise<boolean> | boolean;
  abstract onConfigChange(headscale: Headscale): Promise<void> | void;
  abstract get name(): string;
}