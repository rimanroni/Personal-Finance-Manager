package com.personalfinance.manager;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Small native bridge for the two runtime permissions the app actually needs:
 * notifications (due-date reminders) and photo/gallery access (profile picture
 * and receipt attachments). Target SDK 36 requires explicit runtime grants.
 */
@CapacitorPlugin(name = "AppPermissions")
public class AppPermissionsPlugin extends Plugin {

    private ActivityResultLauncher<String> notificationLauncher;
    private ActivityResultLauncher<String[]> photoLauncher;
    private PluginCall pendingNotificationCall;
    private PluginCall pendingPhotoCall;

    @Override
    public void load() {
        super.load();
        notificationLauncher = bridge.registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            granted -> finishNotification(granted)
        );
        photoLauncher = bridge.registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(),
            results -> {
                boolean granted = false;
                for (Boolean value : results.values()) {
                    if (Boolean.TRUE.equals(value)) { granted = true; break; }
                }
                finishPhotos(granted);
            }
        );
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("notification", notificationPermission() == null ? "granted" : state(notificationPermission()));
        out.put("photos", state(photoPermission()));
        out.put("androidVersion", Build.VERSION.SDK_INT);
        call.resolve(out);
    }

    @PluginMethod
    public void requestNotification(PluginCall call) {
        if (pendingNotificationCall != null) pendingNotificationCall.reject("Another permission request is in progress");
        if (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            JSObject out = new JSObject();
            out.put("granted", true);
            out.put("permanentDenied", false);
            call.resolve(out);
            return;
        }
        if (notificationLauncher == null) {
            call.reject("Permission launcher is not ready");
            return;
        }
        pendingNotificationCall = call;
        notificationLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
    }

    @PluginMethod
    public void requestPhotos(PluginCall call) {
        if (pendingPhotoCall != null) pendingPhotoCall.reject("Another permission request is in progress");
        boolean granted = ContextCompat.checkSelfPermission(getContext(), photoPermission()) == PackageManager.PERMISSION_GRANTED;
        if (Build.VERSION.SDK_INT >= 34 && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED) == PackageManager.PERMISSION_GRANTED) {
            granted = true;
        }
        if (granted) {
            JSObject out = new JSObject();
            out.put("granted", true);
            out.put("permanentDenied", false);
            call.resolve(out);
            return;
        }
        if (photoLauncher == null) {
            call.reject("Permission launcher is not ready");
            return;
        }
        pendingPhotoCall = call;
        String[] permissions = Build.VERSION.SDK_INT >= 34
            ? new String[]{Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED}
            : Build.VERSION.SDK_INT >= 33
                ? new String[]{Manifest.permission.READ_MEDIA_IMAGES}
                : new String[]{Manifest.permission.READ_EXTERNAL_STORAGE};
        photoLauncher.launch(permissions);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open app settings", e);
        }
    }

    private void finishNotification(boolean granted) {
        PluginCall call = pendingNotificationCall;
        pendingNotificationCall = null;
        if (call == null) return;
        JSObject out = new JSObject();
        out.put("granted", granted);
        out.put("permanentDenied", !granted && Build.VERSION.SDK_INT >= 33
            && !ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), Manifest.permission.POST_NOTIFICATIONS));
        call.resolve(out);
    }

    private void finishPhotos(boolean granted) {
        PluginCall call = pendingPhotoCall;
        pendingPhotoCall = null;
        if (call == null) return;
        JSObject out = new JSObject();
        out.put("granted", granted);
        out.put("permanentDenied", !granted && !ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), photoPermission()));
        call.resolve(out);
    }

    private String notificationPermission() {
        if (Build.VERSION.SDK_INT < 33) return null; // implicit on older Android
        return Manifest.permission.POST_NOTIFICATIONS;
    }

    private String photoPermission() {
        if (Build.VERSION.SDK_INT >= 33) return Manifest.permission.READ_MEDIA_IMAGES;
        return Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    /** Turns a platform permission constant into the string the web layer expects. */
    private String state(String permission) {
        if (permission == null) return "granted";
        if (ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED) return "granted";
        if (ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), permission)) return "prompt";
        return "denied";
    }
}
