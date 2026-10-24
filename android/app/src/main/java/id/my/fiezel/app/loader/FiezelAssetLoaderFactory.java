package id.my.fiezel.app.loader;

import android.content.Context;
import android.content.res.AssetManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
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
 *
 * LIVE OVER-THE-AIR (OTA) SYNCHRONIZATION:
 * When online, fiezel.my.id traffic passes through to the live web server so all updates in
 * the repository are instantly reflected in the APK. When offline, bundled local assets provide
 * infallible offline fallback.
 */
public final class FiezelAssetLoaderFactory {

    private static final String TAG = "FiezelAssetLoader";

    public static final String DOMAIN_FIEZEL = "fiezel.my.id";
    public static final String DOMAIN_APPASSETS = "appassets.androidplatform.net";

    private final Context context;
    private final WebViewAssetLoader fiezelAssetLoader;
    private final WebViewAssetLoader appAssetsLoader;

    public FiezelAssetLoaderFactory(@NonNull Context context) {
        this.context = context.getApplicationContext();

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
     * Intercepts a resource request URI and attempts to serve it.
     *
     * LIVE OVER-THE-AIR (OTA) SYNCHRONIZATION STRATEGY:
     * 1. `appassets.androidplatform.net`: Always served from local APK bundled assets.
     * 2. `fiezel.my.id`:
     *    - When the device is ONLINE (connected to internet):
     *      Returns `null`. This allows WebKit to fetch live files directly from `https://fiezel.my.id/app/`.
     *      Every change pushed to the repository is immediately reflected in the APK without requiring
     *      a re-installation or manual update.
     *    - When the device is OFFLINE:
     *      Intercepts the request and serves the bundled fallback assets from `assets/public/`
     *      so the application remains fully functional without crashing.
     */
    @Nullable
    public WebResourceResponse shouldInterceptRequest(@NonNull Uri url) {
        String host = url.getHost();
        if (host == null) {
            return null;
        }

        // Dedicated local virtual domain is ALWAYS served from APK assets
        if (DOMAIN_APPASSETS.equalsIgnoreCase(host)) {
            return appAssetsLoader.shouldInterceptRequest(url);
        }

        // Live production domain (fiezel.my.id):
        // Only serve bundled assets when device has NO internet connection.
        // When online, pass through to the network for instant zero-friction OTA synchronization!
        if (DOMAIN_FIEZEL.equalsIgnoreCase(host) || host.endsWith("." + DOMAIN_FIEZEL)) {
            if (!isNetworkConnected()) {
                Log.d(TAG, "Device is offline. Serving bundled fallback for: " + url.getPath());
                return fiezelAssetLoader.shouldInterceptRequest(url);
            }
            // Online: let WebKit fetch live web content from https://fiezel.my.id/app/
            return null;
        }

        return null;
    }

    /**
     * Checks whether active network connectivity is present.
     */
    public boolean isNetworkConnected() {
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network network = cm.getActiveNetwork();
                if (network == null) return false;
                NetworkCapabilities cap = cm.getNetworkCapabilities(network);
                return cap != null && (
                        cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                        cap.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                        cap.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                );
            } else {
                NetworkInfo info = cm.getActiveNetworkInfo();
                return info != null && info.isConnected();
            }
        } catch (Exception e) {
            return false;
        }
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
            if (cleanPath.contains("?")) {
                cleanPath = cleanPath.substring(0, cleanPath.indexOf("?"));
            }
            if (cleanPath.contains("#")) {
                cleanPath = cleanPath.substring(0, cleanPath.indexOf("#"));
            }
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
