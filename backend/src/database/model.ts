import { users, otp_codes } from "./schema";
import { spreads } from "./utils";

export const db_model = {
  insert: spreads({ users, otp_codes }, "insert"),
  select: spreads({ users, otp_codes }, "select"),
} as const;
