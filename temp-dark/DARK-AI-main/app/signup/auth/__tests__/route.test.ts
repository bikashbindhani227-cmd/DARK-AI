import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockRedirect = jest.fn();

jest.mock("@/lib/auth/auth-redirect-intents", () => ({
  redirectToAuthorizationUrl: mockRedirect,
}));

import { getSignUpUrl } from "@workos-inc/authkit-nextjs";

const mockGetSignUpUrl = getSignUpUrl as jest.MockedFunction<
  typeof getSignUpUrl
>;

describe("GET /signup/auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSignUpUrl.mockResolvedValue("https://signin.yourdomain.com/signup");
    mockRedirect.mockReturnValue({ kind: "redirect" });
  });

  it("starts signup without creating a second attribution handoff", async () => {
    const { GET } = await import("../route");

    const response = await GET({
      url: "https://yourdomain.com/signup/auth",
    } as Request);

    expect(mockGetSignUpUrl).toHaveBeenCalledWith();
    expect(mockRedirect).toHaveBeenCalledWith(
      "https://signin.yourdomain.com/signup",
      new URL("https://yourdomain.com/signup/auth"),
    );
    expect(response).toEqual({ kind: "redirect" });
  });
});
