import { NextRequest } from "next/server";
import { proxyUsersApiRequest } from "../../utils";

export async function PATCH(request: NextRequest) {
  return proxyUsersApiRequest({
    request,
    path: "/api/users/profile/email-opt-in",
    method: "PATCH",
  });
}
