package id.my.fiezel.app.loader;

import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceResponse;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Factory for creating configured WebViewAssetLoader instances that serve local APK bundled
 * assets from `assets/public/`, `assets/www/`, or root `assets/` under virtual HTTPS domains:
 * - https://fiezel.my.id/app/
 * - https://appassets.androidplatform.net/assets/
 */
public final class FiezelAssetLoaderFactory {

    private static final String TAG = "FiezelAssetLoader";

    public static final String DOMAIN_FIEZEL = "fiezel.my.id";
    public static final String DOMAIN_APPASSETS = "appassets.androidplatform.net";

    private final WebViewAssetLoader fiezelAssetLoader;
    private final WebViewAssetLoader appAssetsLoader;

    public FiezelAssetLoaderFactory(@NonNull Context context) {
        // Multi-prefix fallback handler: checks public/, www/, then root assets
        SmartAssetsPathHandler smartHandler = new SmartAssetsPathHandler(context, "public/", "www/", "");

        this.fiezelAssetLoader = new WebViewAssetLoader.Builder()
                .setDomain(DOMAIN_FIEZEL)
                .addPathHandler("/app/", smartHandler)
                .addPathHandler("/assets/", smartHandler)
                .build();

        this.appAssetsLoader = new WebViewAssetLoader.Builder()
                .setDomain(DOMAIN_APPASSETS)
                .addPathHandler("/assets/", smartHandler)
                .addPathHandler("/app/", smartHandler)
                .build();
    }

    /**
     * Intercepts a resource request URI and attempts to serve it from APK assets.
     * Returns null if the request should fall through to network.
     */
    @Nullable
    public WebResourceResponse shouldInterceptRequest(@NonNull Uri url) {
        String host = url.getHost();
        if (host == null) {
            return null;
        }

        if (DOMAIN_FIEZEL.equalsIgnoreCase(host) || host.endsWith("." + DOMAIN_FIEZEL)) {
            WebResourceResponse response = fiezelAssetLoader.shouldInterceptRequest(url);
            if (response != null) {
                return response;
            }
        }

        if (DOMAIN_APPASSETS.equalsIgnoreCase(host)) {
            WebResourceResponse response = appAssetsLoader.shouldInterceptRequest(url);
            if (response != null) {
                return response;
            }
        }

        return null;
    }

    /**
     * Smart path handler that checks multiple candidate subdirectories inside assets/
     * and correctly guesses MIME types and sets CORS headers.
     */
    public static class SmartAssetsPathHandler implements WebViewAssetLoader.PathHandler {
        private final Context context;
        private final String[] prefixes;

        public SmartAssetsPathHandler(@NonNull Context context, @NonNull String... prefixes) {
            this.context = context.getApplicationContext();
            this.prefixes = prefixes;
        }

        @Nullable
        @Override
        public WebResourceResponse handle(@NonNull String path) {
            String cleanPath = path.startsWith("/") ? path.substring(1) : path;
            if (cleanPath.isEmpty() || cleanPath.endsWith("/")) {
                cleanPath += "index.html";
            }

            AssetManager assetManager = context.getAssets();

            for (String prefix : prefixes) {
                String candidate = prefix + cleanPath;
                try {
                    InputStream inputStream = assetManager.open(candidate);
                    String mimeType = guessMimeType(cleanPath);

                    Map<String, String> headers = new HashMap<>();
                    headers.put("Access-Control-Allow-Origin", "*");
                    headers.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
                    headers.put("Cache-Control", "no-cache");

                    return new WebResourceResponse(
                            mimeType,
                            "UTF-8",
                            200,
                            "OK",
                            headers,
                            inputStream
                    );
                } catch (IOException ignored) {
                    // Try next prefix candidate
                }
            }

            Log.d(TAG, "Asset not found locally: " + cleanPath + " (falling back to network)");
            return null;
        }

        @NonNull
        private String guessMimeType(@NonNull String path) {
            String lower = path.toLowerCase();
            if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
            if (lower.endsWith(".js") || lower.endsWith(".mjs")) return "application/javascript";
            if (lower.endsWith(".css")) return "text/css";
            if (lower.endsWith(".json")) return "application/json";
            if (lower.endsWith(".wasm")) return "application/wasm";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".webp")) return "image/webp";
            if (lower.endsWith(".gif")) return "image/gif";
            if (lower.endsWith(".ico")) return "image/x-icon";
            if (lower.endsWith(".mp3")) return "audio/mpeg";
            if (lower.endsWith(".wav")) return "audio/wav";
            if (lower.endsWith(".ogg")) return "audio/ogg";
            if (lower.endsWith(".m4a")) return "audio/mp4";
            if (lower.endsWith(".mp4")) return "video/mp4";
            if (lower.endsWith(".webm")) return "video/webm";
            if (lower.endsWith(".woff2")) return "font/woff2";
            if (lower.endsWith(".woff")) return "font/woff";
            if (lower.endsWith(".ttf")) return "font/ttf";
            if (lower.endsWith(".otf")) return "font/otf";
            return "application/octet-stream";
        }
    }
}
