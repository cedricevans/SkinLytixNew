import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const normalizeEnv = (value?: string) => value?.trim().replace(/^['"]+|['"]+$/g, "") || undefined;
  const supabaseUrl = normalizeEnv(env.VITE_SUPABASE_URL);
  const useFunctionsProxy = env.VITE_USE_FUNCTIONS_PROXY === "true";
  // Optional: allow proxying to a local functions server for development
  const functionsLocalUrl = normalizeEnv(env.VITE_FUNCTIONS_LOCAL_URL);

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: useFunctionsProxy && (functionsLocalUrl || supabaseUrl) ? {
        "/functions": {
          target: `${functionsLocalUrl || supabaseUrl}/functions/v1`,
          changeOrigin: true,
          rewrite: (pathValue) => pathValue.replace(/^\/functions/, ""),
        },
      } : undefined,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
  };
});
