# ProGuard / R8 Configuration for Fiezel Android App
# Add project specific ProGuard rules here.

# AndroidX and Material Components
-keep class com.google.android.material.** { *; }
-dontwarn com.google.android.material.**
-keep class androidx.** { *; }
-dontwarn androidx.**

# Preserve JavaScript Interface annotations and bridge methods
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve WebViewClient, WebChromeClient, and WebView inner interfaces
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, android.webkit.WebResourceRequest);
    public android.webkit.WebResourceResponse *(android.webkit.WebView, android.webkit.WebResourceRequest);
    public void *(android.webkit.WebView, int, java.lang.String, java.lang.String);
    public void *(android.webkit.WebView, android.webkit.WebResourceRequest, android.webkit.WebResourceError);
}

-keepclassmembers class * extends android.webkit.WebChromeClient {
    public void *(android.webkit.WebView, int);
    public void *(android.webkit.WebView, java.lang.String);
    public boolean *(android.webkit.WebView, java.lang.String, java.lang.String, android.webkit.JsResult);
    public boolean *(android.webkit.WebView, java.lang.String, java.lang.String, java.lang.String, android.webkit.JsPromptResult);
    public void *(android.webkit.PermissionRequest);
    public boolean *(android.webkit.WebView, android.webkit.ValueCallback, android.webkit.WebChromeClient$FileChooserParams);
}

# Keep native methods
-keepclassmembers class * {
    native <methods>;
}

# Keep Parcelable and Serializable implementations
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    !private <fields>;
    !private <methods>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep Fiezel specific native bridge or webview package
-keep class id.my.fiezel.app.** { *; }
-keepclassmembers class id.my.fiezel.app.** { *; }
