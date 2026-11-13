import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { defaultTheme, getTheme } from "@/domain/themes";

export const getCurrentTheme = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return defaultTheme;

  const { data } = await supabase
    .from("user_preferences")
    .select("theme")
    .eq("user_id", userId)
    .maybeSingle();
  return getTheme(data?.theme).id;
});
