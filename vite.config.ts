import { defineConfig, loadEnv, type Plugin } from "vite";
import deno from "@deno/vite-plugin";
import react from "@vitejs/plugin-react";
import path from "node:path";
import fs from "node:fs";

function getResolvedConfig(mode: string) {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        appName: env.APP_NAME || env.VITE_APP_NAME || "PrismFin",
        appLogoUrl:
            env.APP_LOGO_URL ||
            env.VITE_APP_LOGO_URL ||
            "/assets/branding/Logo.png",
        appIconUrl:
            env.APP_ICON_URL ||
            env.VITE_APP_ICON_URL ||
            "/assets/branding/icon.png",
        appFaviconUrl:
            env.APP_FAVICON_URL ||
            env.VITE_APP_FAVICON_URL ||
            "/assets/branding/favicon.png",
        accentColor:
            env.APP_ACCENT_COLOR || env.VITE_APP_ACCENT_COLOR || "#06A1DB",
        featuredPlaylist:
            env.FEATURED_PLAYLIST_NAME ||
            env.VITE_FEATURED_PLAYLIST_NAME ||
            "Featured",
        defaultServerUrl:
            env.DEFAULT_SERVER_URL ||
            env.VITE_JELLYFIN_SERVER_URL ||
            "http://jellyfin.local:8096",
    };
}

export default defineConfig(({ mode }) => {
    const initialConfig = getResolvedConfig(mode);
    const jellyfinServer = initialConfig.defaultServerUrl;
    const { appName, accentColor, appIconUrl, appFaviconUrl } = initialConfig;

    const runtimeBrandingPlugin: Plugin = {
        name: "runtime-branding",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ? req.url.split("?")[0] : "";
                if (url === "/config.js") {
                    const currentConfig = getResolvedConfig(mode);
                    res.setHeader(
                        "Content-Type",
                        "application/javascript; charset=utf-8"
                    );
                    res.setHeader(
                        "Cache-Control",
                        "no-cache, no-store, must-revalidate"
                    );
                    res.end(
                        `window.__PRISMFIN_CONFIG__ = ${JSON.stringify(
                            currentConfig,
                            null,
                            4
                        )};`
                    );
                    return;
                }
                if (
                    url === "/manifest.webmanifest" ||
                    url === "/manifest.json"
                ) {
                    const currentConfig = getResolvedConfig(mode);
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
                                name: currentConfig.appName,
                                short_name: currentConfig.appName,
                                description: `${currentConfig.appName} - Apple Liquid Glass Jellyfin Client`,
                                start_url: "/",
                                display: "standalone",
                                background_color: "#000000",
                                theme_color: currentConfig.accentColor,
                                icons: [
                                    {
                                        src: currentConfig.appFaviconUrl,
                                        sizes: "192x192",
                                        type: "image/png",
                                        purpose: "any",
                                    },
                                    {
                                        src: currentConfig.appIconUrl,
                                        sizes: "512x512",
                                        type: "image/png",
                                        purpose: "any",
                                    },
                                    {
                                        src: currentConfig.appIconUrl,
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
        plugins: [deno(), react(), runtimeBrandingPlugin],
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
                    secure: false,
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
