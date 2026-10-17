package id.my.fiezel.app.client;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Custom WebChromeClient for FIEZEL:
 * - Grants CAMERA and AUDIO permissions for verified FIEZEL origins
 * - Supports HTML file input (<input type="file">) via onShowFileChooser
 * - Manages loading progress indicators
 * - Forwards JavaScript console messages to Android Logcat under [FiezelWeb]
 * - Renders native Material 3 alerts and confirms
 */
public class FiezelWebChromeClient extends WebChromeClient {

    private static final String TAG = "[FiezelWeb]";

    public interface PermissionCallback {
        void onResult(boolean allGranted);
    }

    public interface ChromeClientListener {
        void onProgressUpdated(int progress);
        void onRequestRuntimePermissions(@NonNull String[] permissions, @NonNull PermissionCallback callback);
        boolean onOpenFileChooser(@NonNull ValueCallback<Uri[]> filePathCallback, @Nullable FileChooserParams fileChooserParams);
    }

    private final Context context;
    private final ChromeClientListener listener;
    private PermissionRequest pendingPermissionRequest;

    public FiezelWebChromeClient(@NonNull Context context, @NonNull ChromeClientListener listener) {
        this.context = context;
        this.listener = listener;
    }

    @Override
    public void onProgressChanged(WebView view, int newProgress) {
        super.onProgressChanged(view, newProgress);
        listener.onProgressUpdated(newProgress);
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
        if (consoleMessage == null) return false;

        String source = consoleMessage.sourceId();
        if (source != null && source.contains("/")) {
            source = source.substring(source.lastIndexOf('/') + 1);
        }
        String formatted = String.format("%s [%s:%d]",
                consoleMessage.message(),
                source != null ? source : "inline",
                consoleMessage.lineNumber());

        switch (consoleMessage.messageLevel()) {
            case ERROR:
                Log.e(TAG, formatted);
                break;
            case WARNING:
                Log.w(TAG, formatted);
                break;
            case TIP:
            case LOG:
            case DEBUG:
                Log.d(TAG, formatted);
                break;
            default:
                Log.i(TAG, formatted);
                break;
        }
        return true;
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        if (request == null) return;

        Uri origin = request.getOrigin();
        String host = origin != null ? origin.getHost() : null;

        boolean isAllowedOrigin = host != null && (
                host.equalsIgnoreCase("fiezel.my.id") ||
                host.toLowerCase().endsWith(".fiezel.my.id") ||
                host.equalsIgnoreCase("appassets.androidplatform.net") ||
                host.equalsIgnoreCase("localhost") ||
                host.equalsIgnoreCase("127.0.0.1") ||
                host.equalsIgnoreCase("10.0.2.2")
        );

        if (!isAllowedOrigin) {
            Log.w(TAG, "Denied media permission request for untrusted origin: " + origin);
            request.deny();
            return;
        }

        List<String> requiredPermissions = new ArrayList<>();
        final List<String> requestedResources = new ArrayList<>();

        for (String res : request.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res)) {
                requestedResources.add(res);
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    requiredPermissions.add(Manifest.permission.CAMERA);
                }
            } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                requestedResources.add(res);
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    requiredPermissions.add(Manifest.permission.RECORD_AUDIO);
                }
            }
        }

        if (requestedResources.isEmpty()) {
            request.deny();
            return;
        }

        if (requiredPermissions.isEmpty()) {
            // All native permissions already granted
            Log.i(TAG, "Granting media capture permissions directly for origin: " + origin);
            request.grant(requestedResources.toArray(new String[0]));
        } else {
            // Need to prompt user for Android runtime permissions
            this.pendingPermissionRequest = request;
            listener.onRequestRuntimePermissions(
                    requiredPermissions.toArray(new String[0]),
                    allGranted -> {
                        if (pendingPermissionRequest != null && pendingPermissionRequest.equals(request)) {
                            if (allGranted) {
                                Log.i(TAG, "User granted runtime permissions. Granting WebView request.");
                                pendingPermissionRequest.grant(requestedResources.toArray(new String[0]));
                            } else {
                                Log.w(TAG, "User denied runtime permissions. Denying WebView request.");
                                pendingPermissionRequest.deny();
                            }
                            pendingPermissionRequest = null;
                        }
                    }
            );
        }
    }

    @Override
    public void onPermissionRequestCanceled(PermissionRequest request) {
        super.onPermissionRequestCanceled(request);
        if (pendingPermissionRequest != null && pendingPermissionRequest.equals(request)) {
            pendingPermissionRequest = null;
        }
    }

    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
        return listener.onOpenFileChooser(filePathCallback, fileChooserParams);
    }

    @Override
    public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
        new MaterialAlertDialogBuilder(view.getContext())
                .setTitle("FIEZEL")
                .setMessage(message)
                .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                .setCancelable(false)
                .show();
        return true;
    }

    @Override
    public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
        new MaterialAlertDialogBuilder(view.getContext())
                .setTitle("FIEZEL")
                .setMessage(message)
                .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                .setCancelable(false)
                .show();
        return true;
    }
}
