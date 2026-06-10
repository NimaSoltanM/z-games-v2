export type MeResponse = {
  userId: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
};

export type VerifyOtpResponse =
  | { status: "existing" }
  | { status: "new"; registration_token: string };
