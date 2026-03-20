import { NextRequest } from "next/server";
import { proxyUsersApiRequest } from "../../utils";

export async function PUT(request: NextRequest) {
  return proxyUsersApiRequest({
    request,
    path: "/api/users/profile/password",
    method: "PUT",
  });
}
