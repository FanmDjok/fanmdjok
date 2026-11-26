import posthog, { posthogEnabled } from "./posthog";

type LogAttributes = Record<string, string | number | boolean>;

export const posthogLog = {
  info(message: string, attributes: LogAttributes) {
    if (posthogEnabled) posthog.logger.info(message, attributes);
  },
};
