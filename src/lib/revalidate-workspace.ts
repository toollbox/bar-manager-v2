import { revalidatePath } from "next/cache";

export function revalidateWorkspace() {
  for (const path of [
    "/dashboard",
    "/inventory",
    "/cocktails",
    "/service",
    "/purchasing",
    "/reports",
    "/settings",
  ]) {
    revalidatePath(path);
  }
}
