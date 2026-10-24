package id.my.fiezel.app.bridge;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import org.json.JSONObject;

import id.my.fiezel.app.BuildConfig;

/**
 * JavaScript Bridge exposed to the web application as `window.FiezelNative`.
 * Implements hardware telemetry, haptic motors, share sheet, and exam kiosk mode.
 */
public class FiezelNativeBridge {

    private static final String TAG = "FiezelNativeBridge";

    private final Activity activity;
    private final WebView webView;
    private boolean isExamKioskActive = false;

    public FiezelNativeBridge(@NonNull Activity activity, @NonNull WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    /**
     * Returns the native APK version string (e.g., "5.19.0").
     */
    @JavascriptInterface
    @NonNull
    public String getAppVersion() {
        return BuildConfig.VERSION_NAME;
    }

    /**
     * Returns the native Android versionCode (e.g., 51900).
     */
    @JavascriptInterface
    public int getBuildNumber() {
        return BuildConfig.VERSION_CODE;
    }

    /**
     * Triggers a seamless reload of the WebView to immediately synchronize with live server changes.
     */
    @JavascriptInterface
    public void reloadApp() {
        activity.runOnUiThread(() -> {
            if (webView != null) {
                Log.i(TAG, "Native OTA sync reload triggered via bridge");
                webView.reload();
            }
        });
    }

    /**
     * Triggers physical haptic feedback via the Android Vibrator.
     *
     * @param durationMs Milliseconds to vibrate (fallback)
     * @param effectType One of 'light', 'medium', 'heavy', 'success', 'warning', 'error'
     */
    @JavascriptInterface
    public void vibrateHaptic(int durationMs, @Nullable String effectType) {
        activity.runOnUiThread(() -> {
            try {
                Vibrator vibrator = getVibrator();
                if (vibrator == null || !vibrator.hasVibrator()) {
                    return;
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    int effectId = VibrationEffect.EFFECT_CLICK;
                    if ("heavy".equalsIgnoreCase(effectType)) {
                        effectId = VibrationEffect.EFFECT_HEAVY_CLICK;
                    } else if ("double".equalsIgnoreCase(effectType) || "error".equalsIgnoreCase(effectType)) {
                        effectId = VibrationEffect.EFFECT_DOUBLE_CLICK;
                    } else if ("light".equalsIgnoreCase(effectType) || "tick".equalsIgnoreCase(effectType)) {
                        effectId = VibrationEffect.EFFECT_TICK;
                    }
                    vibrator.vibrate(VibrationEffect.createPredefined(effectId));
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    int duration = durationMs > 0 ? durationMs : 40;
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(durationMs > 0 ? durationMs : 40);
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to trigger haptic feedback", e);
            }
        });
    }

    /**
     * Invokes the system native Share Sheet.
     */
    @JavascriptInterface
    public void shareContent(@Nullable String title, @Nullable String text, @Nullable String url) {
        activity.runOnUiThread(() -> {
            try {
                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                sendIntent.setType("text/plain");

                StringBuilder content = new StringBuilder();
                if (text != null && !text.isEmpty()) {
                    content.append(text);
                }
                if (url != null && !url.isEmpty()) {
                    if (content.length() > 0) content.append("\n");
                    content.append(url);
                }

                sendIntent.putExtra(Intent.EXTRA_TEXT, content.toString());
                if (title != null && !title.isEmpty()) {
                    sendIntent.putExtra(Intent.EXTRA_TITLE, title);
                    sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                }

                Intent chooser = Intent.createChooser(sendIntent, title != null ? title : "Bagikan FIEZEL");
                activity.startActivity(chooser);
            } catch (Exception e) {
                Log.e(TAG, "Error invoking share sheet", e);
            }
        });
    }

    /**
     * Toggles native exam kiosk protection.
     * When enabled, prevents screenshots, screen recording, and window previews.
     */
    @JavascriptInterface
    public void setKioskProctoring(boolean enabled) {
        this.isExamKioskActive = enabled;
        activity.runOnUiThread(() -> {
            if (enabled) {
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                Log.i(TAG, "Kiosk proctoring ENABLED (FLAG_SECURE active)");
            } else {
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                Log.i(TAG, "Kiosk proctoring DISABLED");
            }
        });
    }

    /**
     * Checks if kiosk proctoring is currently active.
     */
    public boolean isKioskProctoringActive() {
        return isExamKioskActive;
    }

    /**
     * Checks real-time native network connectivity.
     */
    @JavascriptInterface
    public boolean isNetworkAvailable() {
        try {
            ConnectivityManager cm = (ConnectivityManager) activity.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.net.Network activeNetwork = cm.getActiveNetwork();
                if (activeNetwork == null) return false;
                NetworkCapabilities capabilities = cm.getNetworkCapabilities(activeNetwork);
                return capabilities != null && (
                        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                );
            } else {
                android.net.NetworkInfo networkInfo = cm.getActiveNetworkInfo();
                return networkInfo != null && networkInfo.isConnected();
            }
        } catch (Exception e) {
            Log.w(TAG, "Error checking network connectivity", e);
            return false;
        }
    }

    /**
     * Returns hardware and device telemetry in JSON string format.
     */
    @JavascriptInterface
    @NonNull
    public String getDeviceInfo() {
        try {
            JSONObject obj = new JSONObject();
            obj.put("manufacturer", Build.MANUFACTURER);
            obj.put("model", Build.MODEL);
            obj.put("brand", Build.BRAND);
            obj.put("sdkInt", Build.VERSION.SDK_INT);
            obj.put("release", Build.VERSION.RELEASE);
            obj.put("appVersion", BuildConfig.VERSION_NAME);
            obj.put("buildNumber", BuildConfig.VERSION_CODE);
            return obj.toString();
        } catch (Exception e) {
            Log.e(TAG, "Error generating device info", e);
            return "{}";
        }
    }

    @Nullable
    private Vibrator getVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vibratorManager != null ? vibratorManager.getDefaultVibrator() : null;
        } else {
            return (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
        }
    }
}
