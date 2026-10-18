package id.my.fiezel.app.client;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.util.Log;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import id.my.fiezel.app.loader.FiezelAssetLoaderFactory;

/**
 * Custom WebViewClient for FIEZEL:
 * - Intercepts asset requests and streams local bundled files via FiezelAssetLoaderFactory
 * - Internal URLs (fiezel.my.id, appassets.androidplatform.net) stay in WebView
 * - External URLs (WhatsApp, external docs/links, mailto, tel) open in external apps
 * - Catches main frame errors and notifies listener to render Fiezel-branded offline fallback screen
 */
public class FiezelWebViewClient extends WebViewClient {

    private static final String TAG = "[FiezelWeb]";

    public interface WebViewClientListener {
        void onPageLoadingStarted(@NonNull String url);
        void onPageLoadingFinished(@NonNull String url);
        void onMainFrameError(@NonNull String failingUrl, int errorCode, @NonNull String description);
        void onMainFrameHttpError(@NonNull String failingUrl, int statusCode);
    }

    private final Context context;
    private final FiezelAssetLoaderFactory assetLoaderFactory;
    private final WebViewClientListener listener;

    public FiezelWebViewClient(
            @NonNull Context context,
            @NonNull FiezelAssetLoaderFactory assetLoaderFactory,
            @NonNull WebViewClientListener listener) {
        this.context = context.getApplicationContext();
        this.assetLoaderFactory = assetLoaderFactory;
        this.listener = listener;
    }

    @Nullable
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        if (request != null && request.getUrl() != null) {
            WebResourceResponse localResponse = assetLoaderFactory.shouldInterceptRequest(request.getUrl());
            if (localResponse != null) {
                return localResponse;
            }
        }
        return super.shouldInterceptRequest(view, request);
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (request == null || request.getUrl() == null) {
            return false;
        }
        return handleUrlNavigation(view, request.getUrl());
    }

    @Override
    @SuppressWarnings("deprecation")
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        if (url == null) return false;
        return handleUrlNavigation(view, Uri.parse(url));
    }

    /**
     * Inspects URI and determines whether to keep navigation inside the WebView
     * or launch an external Android Intent.
     */
    private boolean handleUrlNavigation(@NonNull WebView view, @NonNull Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null) return false;

        // 1. Custom app deep link: fiezel://...
        if ("fiezel".equalsIgnoreCase(scheme)) {
            String path = uri.getPath();
            String query = uri.getQuery();
            String target = "https://" + FiezelAssetLoaderFactory.DOMAIN_FIEZEL + "/app"
                    + (path != null ? path : "")
                    + (query != null ? "?" + query : "");
            Log.d(TAG, "Navigating internal deep link to: " + target);
            view.loadUrl(target);
            return true;
        }

        // 2. Standard protocol intents: tel:, mailto:, sms:, whatsapp:
        if ("tel".equalsIgnoreCase(scheme) ||
            "mailto".equalsIgnoreCase(scheme) ||
            "sms".equalsIgnoreCase(scheme) ||
            "whatsapp".equalsIgnoreCase(scheme)) {
            launchExternalIntent(uri);
            return true;
        }

        String host = uri.getHost();

        // 3. Internal domains stay inside the WebView
        boolean isInternal = host != null && (
                host.equalsIgnoreCase(FiezelAssetLoaderFactory.DOMAIN_FIEZEL) ||
                host.toLowerCase().endsWith("." + FiezelAssetLoaderFactory.DOMAIN_FIEZEL) ||
                host.equalsIgnoreCase(FiezelAssetLoaderFactory.DOMAIN_APPASSETS) ||
                host.equalsIgnoreCase("localhost") ||
                host.equalsIgnoreCase("127.0.0.1") ||
                host.equalsIgnoreCase("10.0.2.2")
        );

        if (isInternal) {
            return false; // Allow WebView to load internally
        }

        // 4. External links (wa.me, external documentation, third-party auth) open externally
        Log.i(TAG, "Routing external URL to system handler: " + uri);
        launchExternalIntent(uri);
        return true;
    }

    private void launchExternalIntent(@NonNull Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Log.w(TAG, "No Android application available to handle: " + uri, e);
        } catch (Exception e) {
            Log.e(TAG, "Error launching external intent for: " + uri, e);
        }
    }

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        super.onPageStarted(view, url, favicon);
        if (url != null) {
            listener.onPageLoadingStarted(url);
        }
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (url != null) {
            listener.onPageLoadingFinished(url);
        }
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        if (request != null && request.isForMainFrame()) {
            int errorCode = error != null ? error.getErrorCode() : -1;
            String description = (error != null && error.getDescription() != null)
                    ? error.getDescription().toString()
                    : "Connection error";
            String failingUrl = request.getUrl() != null ? request.getUrl().toString() : "";
            Log.w(TAG, "Main frame connection failed: " + errorCode + " - " + description + " [" + failingUrl + "]");
            listener.onMainFrameError(failingUrl, errorCode, description);
        }
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        super.onReceivedHttpError(view, request, errorResponse);
        if (request != null && request.isForMainFrame() && errorResponse != null) {
            int statusCode = errorResponse.getStatusCode();
            if (statusCode >= 400) {
                String failingUrl = request.getUrl() != null ? request.getUrl().toString() : "";
                Log.w(TAG, "Main frame HTTP error: " + statusCode + " [" + failingUrl + "]");
                listener.onMainFrameHttpError(failingUrl, statusCode);
            }
        }
    }
}
