import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const jellyfinServer =
        env.VITE_JELLYFIN_SERVER_URL || "http://jellyfin.local:8096";

    const appName = env.APP_NAME || env.VITE_APP_NAME || "PrismFin";
    const accentColor =
        env.APP_ACCENT_COLOR || env.VITE_APP_ACCENT_COLOR || "#06A1DB";
    const appIconUrl =
        env.APP_ICON_URL ||
        env.VITE_APP_ICON_URL ||
        "/assets/branding/icon.png";
    const appFaviconUrl =
        env.APP_FAVICON_URL ||
        env.VITE_APP_FAVICON_URL ||
        "/assets/branding/favicon.png";

    const pwaBrandingPlugin: Plugin = {
        name: "pwa-branding",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ? req.url.split("?")[0] : "";
                if (url === "/manifest.webmanifest" || url === "/manifest.json") {
                    res.setHeader(
                        "Content-Type",
                        "application/manifest+json; charset=utf-8"
                    );
                    res.setHeader(
                        "Cache-Control",
                        "no-cache, no-store, must-revalidate"
                    );
                    res.end(
                        JSON.stringify(
                            {
                                name: appName,
                                short_name: appName,
                                description: `${appName} - Apple Liquid Glass Jellyfin Client`,
                                start_url: "/",
                                display: "standalone",
                                background_color: "#000000",
                                theme_color: accentColor,
                                icons: [
                                    {
                                        src: appFaviconUrl,
                                        sizes: "192x192",
                                        type: "image/png",
                                        purpose: "any",
                                    },
                                    {
                                        src: appIconUrl,
                                        sizes: "512x512",
                                        type: "image/png",
                                        purpose: "any",
                                    },
                                    {
                                        src: appIconUrl,
                                        sizes: "512x512",
                                        type: "image/png",
                                        purpose: "maskable",
                                    },
                                ],
                            },
                            null,
                            4
                        )
                    );
                    return;
                }
                next();
            });
        },
        transformIndexHtml(html: string) {
            let transformed = html
                .replace(/<title>[^<]*<\/title>/, `<title>${appName}</title>`)
                .replace(
                    /<meta name="apple-mobile-web-app-title" content="[^"]*"/,
                    `<meta name="apple-mobile-web-app-title" content="${appName}"`
                )
                .replace(
                    /<meta name="application-name" content="[^"]*"/,
                    `<meta name="application-name" content="${appName}"`
                )
                .replace(
                    /<meta name="theme-color" content="[^"]*"/,
                    `<meta name="theme-color" content="${accentColor}"`
                );
            if (appIconUrl !== "/assets/branding/icon.png") {
                transformed = transformed.replace(
                    /<link rel="apple-touch-icon"[^>]*href="[^"]*"/g,
                    `<link rel="apple-touch-icon" href="${appIconUrl}"`
                );
            }
            if (appFaviconUrl !== "/assets/branding/favicon.png") {
                transformed = transformed.replace(
                    /<link rel="icon"[^>]*href="[^"]*"/g,
                    `<link rel="icon" href="${appFaviconUrl}"`
                );
            }
            return transformed;
        },
    };

    const keyPath = path.resolve(__dirname, "./localhost.key");
    const certPath = path.resolve(__dirname, "./localhost.crt");
    const hasCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

    return {
        plugins: [react(), pwaBrandingPlugin],
        css: {
            preprocessorOptions: {
                scss: {
                    api: "modern-compiler",
                },
            },
        },
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes("hls.js")) {
                            return "hls-player";
                        }
                    },
                },
            },
        },
        server: {
            port: 5173,
            host: true,
            https: hasCert
                ? {
                      key: fs.readFileSync(keyPath),
                      cert: fs.readFileSync(certPath),
                  }
                : undefined,
            proxy: {
                "/jellyfin-proxy": {
                    target: jellyfinServer,
                    changeOrigin: true,
                    ws: true,
                    rewrite: (p) => p.replace(/^\/jellyfin-proxy/, ""),
                },
                "^/sso/OID/(start|Auth)/[a-zA-Z0-9_-]+(?:\\?.*)?$": {
                    target: jellyfinServer,
                    changeOrigin: false,
                    configure: (proxy) => {
                        proxy.on("proxyReq", (proxyReq, req) => {
                            const host = req.headers.host || "localhost:5173";
                            const defaultProto = hasCert ? "https" : "http";
                            const proto =
                                (req.headers["x-forwarded-proto"] as string) ||
                                defaultProto;
                            proxyReq.setHeader("Host", host);
                            proxyReq.setHeader("X-Forwarded-Host", host);
                            proxyReq.setHeader("X-Forwarded-Proto", proto);
                        });
                    },
                },
                "^/api/sso-validate/[a-zA-Z0-9_-]+(?:\\?.*)?$": {
                    target: jellyfinServer,
                    changeOrigin: false,
                    rewrite: (p) =>
                        p.replace(/^\/api\/sso-validate\//, "/sso/OID/redirect/"),
                    configure: (proxy) => {
                        proxy.on("proxyReq", (proxyReq, req) => {
                            const host = req.headers.host || "localhost:5173";
                            const defaultProto = hasCert ? "https" : "http";
                            const proto =
                                (req.headers["x-forwarded-proto"] as string) ||
                                defaultProto;
                            proxyReq.setHeader("Host", host);
                            proxyReq.setHeader("X-Forwarded-Host", host);
                            proxyReq.setHeader("X-Forwarded-Proto", proto);
                        });
                    },
                },
            },
        },
    };
});
