package id.my.fiezel.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;

import id.my.fiezel.app.bridge.FiezelNativeBridge;
import id.my.fiezel.app.client.FiezelWebChromeClient;
import id.my.fiezel.app.client.FiezelWebViewClient;
import id.my.fiezel.app.loader.FiezelAssetLoaderFactory;

/**
 * Main host activity for FIEZEL:
 * - Edge-to-edge window rendering with hardware acceleration
 * - High-performance WebKit setup with custom WebViewAssetLoader
 * - Runtime camera and audio permission dispatch for speaking exams
 * - HTML5 file chooser bridge
 * - AndroidX OnBackPressedDispatcher navigation & kiosk protection
 * - Pull-to-refresh with scroll collision protection
 * - Resilient offline fallback screen with interactive retry
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    private static final String DEFAULT_ENTRY_URL = "https://fiezel.my.id/app/";
    private static final long BACK_PRESS_INTERVAL_MS = 2000L;

    // View Components
    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ProgressBar progressBar;
    private View offlineContainer;
    private TextView tvErrorMessage;
    private Button btnRetry;

    // Controllers & Bridges
    private FiezelAssetLoaderFactory assetLoaderFactory;
    private FiezelNativeBridge nativeBridge;
    private FiezelWebChromeClient.PermissionCallback pendingPermissionCallback;
    private ValueCallback<Uri[]> mFilePathCallback;

    // Navigation & State
    private String lastAttemptedUrl = DEFAULT_ENTRY_URL;
    private boolean isOfflineVisible = false;
    private long lastBackPressTimestamp = 0L;

    // Activity Result Launchers
    private ActivityResultLauncher<String[]> runtimePermissionLauncher;
    private ActivityResultLauncher<Intent> filePickerLauncher;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Edge-to-Edge Windowing & Full Hardware Acceleration
        setupWindowEnvironment();

        // 2. Register Result Launchers for Permissions and File Chooser
        registerActivityLaunchers();

        // 3. Set Content Layout
        setContentView(R.layout.activity_main);

        // 4. Bind UI Views
        initViews();

        // 5. Initialize WebViewAssetLoader Factory
        assetLoaderFactory = new FiezelAssetLoaderFactory(this);

        // 6. Configure WebView & Settings
        setupWebView();

        // 7. Setup Pull-To-Refresh
        setupSwipeRefresh();

        // 8. Setup Back Navigation Controller
        setupBackNavigation();

        // 9. Load Entry URL or Deep Link
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            handleIntent(getIntent());
        }
    }

    /**
     * Configures edge-to-edge drawing and hardware acceleration flags.
     */
    private void setupWindowEnvironment() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
    }

    /**
     * Registers ActivityResultLaunchers before Activity is STARTED.
     */
    private void registerActivityLaunchers() {
        // Runtime permission launcher (Camera & Microphone)
        runtimePermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                resultMap -> {
                    boolean allGranted = true;
                    for (Boolean granted : resultMap.values()) {
                        if (!Boolean.TRUE.equals(granted)) {
                            allGranted = false;
                            break;
                        }
                    }
                    if (pendingPermissionCallback != null) {
                        pendingPermissionCallback.onResult(allGranted);
                        pendingPermissionCallback = null;
                    }
                }
        );

        // File picker launcher (<input type="file">)
        filePickerLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (mFilePathCallback == null) return;

                    Uri[] results = null;
                    if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                        Intent data = result.getData();
                        if (data.getData() != null) {
                            results = new Uri[]{data.getData()};
                        } else if (data.getClipData() != null) {
                            int count = data.getClipData().getItemCount();
                            results = new Uri[count];
                            for (int i = 0; i < count; i++) {
                                results[i] = data.getClipData().getItemAt(i).getUri();
                            }
                        }
                    }

                    mFilePathCallback.onReceiveValue(results);
                    mFilePathCallback = null;
                }
        );
    }

    /**
     * Binds layout views and configures offline retry action.
     */
    private void initViews() {
        webView = findViewById(R.id.webView);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);
        progressBar = findViewById(R.id.progressBar);
        offlineContainer = findViewById(R.id.offlineContainer);
        tvErrorMessage = findViewById(R.id.tvErrorMessage);
        btnRetry = findViewById(R.id.btnRetry);

        btnRetry.setOnClickListener(v -> retryConnection());
    }

    /**
     * Configures WebSettings, hardware layer, clients, and native bridge.
     */
    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        // Ensure hardware layer acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();

        // Core capabilities
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Cache mode based on network connectivity
        if (isNetworkConnected()) {
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        } else {
            settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        }

        // Security hardening
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);

        // Viewport and responsive scaling
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setDisplayZoomControls(false);

        // App User-Agent signature
        String baseUA = settings.getUserAgentString();
        settings.setUserAgentString(baseUA + " FiezelApp/" + BuildConfig.VERSION_NAME + " (Android; NativeShell)");

        // Attach Native JavaScript Bridge (window.FiezelNative)
        nativeBridge = new FiezelNativeBridge(this, webView);
        webView.addJavascriptInterface(nativeBridge, "FiezelNative");

        // Custom WebChromeClient
        FiezelWebChromeClient chromeClient = new FiezelWebChromeClient(this, new FiezelWebChromeClient.ChromeClientListener() {
            @Override
            public void onProgressUpdated(int progress) {
                if (progressBar != null) {
                    if (progress < 100) {
                        progressBar.setVisibility(View.VISIBLE);
                        progressBar.setProgress(progress);
                    } else {
                        progressBar.setProgress(100);
                        progressBar.setVisibility(View.GONE);
                        if (swipeRefreshLayout != null && swipeRefreshLayout.isRefreshing()) {
                            swipeRefreshLayout.setRefreshing(false);
                        }
                    }
                }
            }

            @Override
            public void onRequestRuntimePermissions(@NonNull String[] permissions, @NonNull FiezelWebChromeClient.PermissionCallback callback) {
                pendingPermissionCallback = callback;
                runtimePermissionLauncher.launch(permissions);
            }

            @Override
            public boolean onOpenFileChooser(@NonNull ValueCallback<Uri[]> filePathCallback, @Nullable WebChromeClient.FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                    mFilePathCallback = null;
                }
                mFilePathCallback = filePathCallback;

                Intent intent = null;
                if (fileChooserParams != null) {
                    try {
                        intent = fileChooserParams.createIntent();
                    } catch (Exception e) {
                        Log.w(TAG, "Cannot create intent from FileChooserParams, using fallback", e);
                    }
                }

                if (intent == null) {
                    intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                }

                try {
                    filePickerLauncher.launch(intent);
                    return true;
                } catch (ActivityNotFoundException e) {
                    Log.e(TAG, "No activity available to handle file chooser", e);
                    mFilePathCallback.onReceiveValue(null);
                    mFilePathCallback = null;
                    return false;
                }
            }
        });
        webView.setWebChromeClient(chromeClient);

        // Custom WebViewClient
        FiezelWebViewClient webViewClient = new FiezelWebViewClient(this, assetLoaderFactory, new FiezelWebViewClient.WebViewClientListener() {
            @Override
            public void onPageLoadingStarted(@NonNull String url) {
                lastAttemptedUrl = url;
                if (progressBar != null) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(15);
                }
            }

            @Override
            public void onPageLoadingFinished(@NonNull String url) {
                if (!isOfflineVisible) {
                    showOfflineScreen(false, null);
                }
                if (progressBar != null) {
                    progressBar.setVisibility(View.GONE);
                }
                if (swipeRefreshLayout != null && swipeRefreshLayout.isRefreshing()) {
                    swipeRefreshLayout.setRefreshing(false);
                }
            }

            @Override
            public void onMainFrameError(@NonNull String failingUrl, int errorCode, @NonNull String description) {
                lastAttemptedUrl = failingUrl;
                showOfflineScreen(true, description);
            }

            @Override
            public void onMainFrameHttpError(@NonNull String failingUrl, int statusCode) {
                if (statusCode >= 500) {
                    lastAttemptedUrl = failingUrl;
                    showOfflineScreen(true, "Server error (" + statusCode + ")");
                }
            }
        });
        webView.setWebViewClient(webViewClient);
    }

    /**
     * Sets up SwipeRefreshLayout with child scroll inspection to avoid gesture collision.
     */
    private void setupSwipeRefresh() {
        swipeRefreshLayout.setColorSchemeColors(
                ContextCompat.getColor(this, R.color.fiezel_primary),
                ContextCompat.getColor(this, R.color.fiezel_accent),
                ContextCompat.getColor(this, R.color.fiezel_cyan)
        );

        swipeRefreshLayout.setOnRefreshListener(() -> {
            if (isOfflineVisible) {
                retryConnection();
            } else {
                webView.reload();
            }
        });

        // Prevent pull-to-refresh triggering when webView has scrolled down
        swipeRefreshLayout.setOnChildScrollUpCallback((parent, child) -> {
            if (webView != null) {
                return webView.getScrollY() > 0;
            }
            return false;
        });
    }

    /**
     * Implements predictive back navigation and kiosk exam exit confirmation.
     */
    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // If exam kiosk proctoring is active, display confirmation modal
                if (nativeBridge != null && nativeBridge.isKioskProctoringActive()) {
                    showKioskExitConfirmation();
                    return;
                }

                // If offline error view is showing and webView can go back, go back
                if (isOfflineVisible) {
                    if (webView != null && webView.canGoBack()) {
                        showOfflineScreen(false, null);
                        webView.goBack();
                        return;
                    }
                }

                // Standard web app back history navigation
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    // Double-tap back within 2000ms to exit app cleanly
                    long currentTime = System.currentTimeMillis();
                    if (currentTime - lastBackPressTimestamp < BACK_PRESS_INTERVAL_MS) {
                        finish();
                    } else {
                        lastBackPressTimestamp = currentTime;
                        Toast.makeText(MainActivity.this, R.string.exit_confirm_toast, Toast.LENGTH_SHORT).show();
                    }
                }
            }
        });
    }

    /**
     * Prompts student if they attempt to exit during an active exam.
     */
    private void showKioskExitConfirmation() {
        new MaterialAlertDialogBuilder(this)
                .setTitle("FIEZEL")
                .setMessage(R.string.kiosk_exit_warning)
                .setPositiveButton("Tetap di Ujian", (dialog, which) -> dialog.dismiss())
                .setNegativeButton("Keluar", (dialog, which) -> {
                    if (nativeBridge != null) {
                        nativeBridge.setKioskProctoring(false);
                    }
                    if (webView != null && webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        finish();
                    }
                })
                .setCancelable(false)
                .show();
    }

    /**
     * Displays or hides the branded offline fallback UI.
     */
    private void showOfflineScreen(boolean show, @Nullable String errorMessage) {
        this.isOfflineVisible = show;
        if (offlineContainer != null) {
            offlineContainer.setVisibility(show ? View.VISIBLE : View.GONE);
        }
        if (webView != null) {
            webView.setVisibility(show ? View.GONE : View.VISIBLE);
        }
        if (swipeRefreshLayout != null && swipeRefreshLayout.isRefreshing()) {
            swipeRefreshLayout.setRefreshing(false);
        }
        if (progressBar != null) {
            progressBar.setVisibility(View.GONE);
        }
        if (show && tvErrorMessage != null) {
            if (errorMessage != null && !errorMessage.isEmpty()) {
                tvErrorMessage.setText(errorMessage);
            } else {
                tvErrorMessage.setText(R.string.offline_subtitle);
            }
        }
    }

    /**
     * Retries loading the last failed URL or default entry point.
     */
    private void retryConnection() {
        showOfflineScreen(false, null);
        if (lastAttemptedUrl != null && !lastAttemptedUrl.isEmpty()) {
            webView.loadUrl(lastAttemptedUrl);
        } else {
            webView.loadUrl(DEFAULT_ENTRY_URL);
        }
    }

    /**
     * Handles incoming launch intent and deep links.
     */
    private void handleIntent(@Nullable Intent intent) {
        if (intent == null) {
            webView.loadUrl(DEFAULT_ENTRY_URL);
            return;
        }

        Uri data = intent.getData();
        if (data != null) {
            String scheme = data.getScheme();
            if ("fiezel".equalsIgnoreCase(scheme)) {
                String path = data.getPath();
                String query = data.getQuery();
                String targetUrl = "https://" + FiezelAssetLoaderFactory.DOMAIN_FIEZEL + "/app"
                        + (path != null ? path : "")
                        + (query != null ? "?" + query : "");
                webView.loadUrl(targetUrl);
                return;
            } else if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                webView.loadUrl(data.toString());
                return;
            }
        }

        webView.loadUrl(DEFAULT_ENTRY_URL);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private boolean isNetworkConnected() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                android.net.Network network = cm.getActiveNetwork();
                if (network == null) return false;
                NetworkCapabilities cap = cm.getNetworkCapabilities(network);
                return cap != null && (
                        cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                        cap.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                        cap.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                );
            } else {
                android.net.NetworkInfo info = cm.getActiveNetworkInfo();
                return info != null && info.isConnected();
            }
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onRestoreInstanceState(@NonNull Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        if (webView != null) {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
