import { companionTopic as topicFor, type CompanionTopic } from "@website/funnels/companion-topics";
import type { User } from "./api/types";

// The companion's suggestions for what this person is carrying. The topics live with the quiz options
// (website/funnels/companion-topics.ts) so the web app shows the same ones.

export type { CompanionTopic };

export function companionTopic(user: Pick<User, "struggles"> | null | undefined): CompanionTopic {
  return topicFor(user?.struggles);
}
