// Discover Rapa Nui — cliente Supabase compartido (sin build step, vía CDN).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CONFIG } from "./config.js";

if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.includes("TU-PROYECTO")) {
  console.warn(
    "[Discover Rapa Nui] Falta configurar assets/js/config.js con las credenciales reales de Supabase."
  );
}

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
export { CONFIG };
