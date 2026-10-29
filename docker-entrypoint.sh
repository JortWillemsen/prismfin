#!/bin/sh
set -e

CONFIG_FILE="/usr/share/nginx/html/config.js"

# Helper function to strip surrounding quotes (single/double) and escape inner double quotes
clean_val() {
    printf "%s" "$1" | sed -e "s/^[ '\''\"]*//" -e "s/[ '\''\"]*$//" -e "s/\"/\\\\\"/g"
}

# Resolve environment variables, prioritizing direct names then VITE_* prefixes
RAW_APP_NAME="${APP_NAME:-${VITE_APP_NAME:-PrismFin}}"
RAW_LOGO_URL="${APP_LOGO_URL:-${VITE_APP_LOGO_URL:-/assets/branding/Logo.png}}"
RAW_ICON_URL="${APP_ICON_URL:-${VITE_APP_ICON_URL:-/assets/branding/icon.png}}"
RAW_FAVICON_URL="${APP_FAVICON_URL:-${VITE_APP_FAVICON_URL:-/assets/branding/favicon.png}}"
RAW_ACCENT_COLOR="${APP_ACCENT_COLOR:-${VITE_APP_ACCENT_COLOR:-#06A1DB}}"
RAW_FEATURED_PLAYLIST="${FEATURED_PLAYLIST_NAME:-${VITE_FEATURED_PLAYLIST_NAME:-Featured}}"
RAW_SERVER_URL="${DEFAULT_SERVER_URL:-${VITE_JELLYFIN_SERVER_URL:-http://jellyfin.local:8096}}"
RAW_INTERNAL_URL="${JELLYFIN_INTERNAL_URL:-${JELLYFIN_BACKEND_URL:-${RAW_SERVER_URL}}}"

CLEAN_APP_NAME="$(clean_val "$RAW_APP_NAME")"
CLEAN_LOGO_URL="$(clean_val "$RAW_LOGO_URL")"
CLEAN_ICON_URL="$(clean_val "$RAW_ICON_URL")"
CLEAN_FAVICON_URL="$(clean_val "$RAW_FAVICON_URL")"
CLEAN_ACCENT_COLOR="$(clean_val "$RAW_ACCENT_COLOR")"
CLEAN_FEATURED_PLAYLIST="$(clean_val "$RAW_FEATURED_PLAYLIST")"
CLEAN_SERVER_URL="$(clean_val "$RAW_SERVER_URL")"
CLEAN_INTERNAL_URL="$(clean_val "$RAW_INTERNAL_URL")"

echo "[PrismFin] Initializing runtime configuration..."
echo "[PrismFin] App Name: ${CLEAN_APP_NAME}"
echo "[PrismFin] Accent Color: ${CLEAN_ACCENT_COLOR}"
echo "[PrismFin] Server URL (Browser): ${CLEAN_SERVER_URL}"
echo "[PrismFin] Internal Server URL (Proxy): ${CLEAN_INTERNAL_URL}"

cat <<EOF > "$CONFIG_FILE"
// Generated at container startup by docker-entrypoint.sh
window.__PRISMFIN_CONFIG__ = {
    appName: "${CLEAN_APP_NAME}",
    appLogoUrl: "${CLEAN_LOGO_URL}",
    appIconUrl: "${CLEAN_ICON_URL}",
    appFaviconUrl: "${CLEAN_FAVICON_URL}",
    accentColor: "${CLEAN_ACCENT_COLOR}",
    featuredPlaylist: "${CLEAN_FEATURED_PLAYLIST}",
    defaultServerUrl: "${CLEAN_SERVER_URL}"
};
EOF

echo "[PrismFin] Configuration written to $CONFIG_FILE"

# Dynamically generate manifest.webmanifest with configured app branding
MANIFEST_FILE="/usr/share/nginx/html/manifest.webmanifest"
if [ -d "/usr/share/nginx/html" ]; then
    echo "[PrismFin] Generating manifest.webmanifest with app name '${CLEAN_APP_NAME}'..."
    cat <<EOF > "$MANIFEST_FILE"
{
    "name": "${CLEAN_APP_NAME}",
    "short_name": "${CLEAN_APP_NAME}",
    "description": "${CLEAN_APP_NAME} - Apple Liquid Glass Jellyfin Client",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#000000",
    "theme_color": "${CLEAN_ACCENT_COLOR}",
    "icons": [
        {
            "src": "${CLEAN_FAVICON_URL}",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "${CLEAN_ICON_URL}",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any"
        },
        {
            "src": "${CLEAN_ICON_URL}",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
        }
    ]
}
EOF
fi

# Dynamically update index.html metadata tags for mobile PWA installation
INDEX_FILE="/usr/share/nginx/html/index.html"
if [ -f "$INDEX_FILE" ]; then
    echo "[PrismFin] Updating index.html branding and PWA metadata..."
    SED_APP_NAME="$(printf '%s' "$CLEAN_APP_NAME" | sed 's/[&/|]/\\&/g')"
    SED_ACCENT_COLOR="$(printf '%s' "$CLEAN_ACCENT_COLOR" | sed 's/[&/|]/\\&/g')"
    SED_ICON_URL="$(printf '%s' "$CLEAN_ICON_URL" | sed 's/[&/|]/\\&/g')"
    SED_FAVICON_URL="$(printf '%s' "$CLEAN_FAVICON_URL" | sed 's/[&/|]/\\&/g')"

    sed -i "s|<title>[^<]*</title>|<title>${SED_APP_NAME}</title>|g" "$INDEX_FILE"
    sed -i "s|<meta name=\"apple-mobile-web-app-title\" content=\"[^\"]*\"|<meta name=\"apple-mobile-web-app-title\" content=\"${SED_APP_NAME}\"|g" "$INDEX_FILE"
    sed -i "s|<meta name=\"application-name\" content=\"[^\"]*\"|<meta name=\"application-name\" content=\"${SED_APP_NAME}\"|g" "$INDEX_FILE"
    sed -i "s|<meta name=\"theme-color\" content=\"[^\"]*\"|<meta name=\"theme-color\" content=\"${SED_ACCENT_COLOR}\"|g" "$INDEX_FILE"
    if [ "$CLEAN_ICON_URL" != "/assets/branding/icon.png" ]; then
        sed -i "s|<link rel=\"apple-touch-icon\"[^\>]*href=\"[^\"]*\"|<link rel=\"apple-touch-icon\" href=\"${SED_ICON_URL}\"|g" "$INDEX_FILE"
    fi
    if [ "$CLEAN_FAVICON_URL" != "/assets/branding/favicon.png" ]; then
        sed -i "s|<link rel=\"icon\"[^\>]*href=\"[^\"]*\"|<link rel=\"icon\" href=\"${SED_FAVICON_URL}\"|g" "$INDEX_FILE"
    fi
fi

# Substitute Jellyfin Server URL in Nginx configuration if present
if [ -f /etc/nginx/conf.d/default.conf ]; then
    echo "[PrismFin] Configuring Nginx SSO reverse proxy to ${CLEAN_INTERNAL_URL}..."
    sed -i "s|__JELLYFIN_SERVER_URL__|${CLEAN_INTERNAL_URL}|g" /etc/nginx/conf.d/default.conf
fi

exec "$@"
