import { authHandlers } from "./auth";
import { playersHandlers } from "./players";
import { teamsHandlers } from "./teams";
import { searchHandlers } from "./search";
import { messagingHandlers } from "./messaging";
import { adminHandlers } from "./admin";
import { subscriptionHandlers } from "./subscription";

export const handlers = [
  ...authHandlers,
  ...playersHandlers,
  ...teamsHandlers,
  ...searchHandlers,
  ...messagingHandlers,
  ...adminHandlers,
  ...subscriptionHandlers,
];
