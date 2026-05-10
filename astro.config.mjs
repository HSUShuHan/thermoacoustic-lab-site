import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://thermoacoustictw.org",
  i18n: {
    defaultLocale: "zh-TW",
    locales: ["zh-TW", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [mdx(), icon(), sitemap()],
  redirects: {
    "/home": "/",
    "/index.php": "/",
    "/wp-admin": "/",
  },
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: "github-light",
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
