package com.personalfinance.manager;

import android.app.Activity;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.CommonStatusCodes;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Task;

import java.util.Arrays;
import java.util.List;

/**
 * Native Android Google Sign-In / authorization for Capacitor.
 *
 * Uses Google Identity Services (AuthorizationClient) instead of the web
 * GIS popup. The OAuth client is resolved from the app's package name +
 * SHA-1 fingerprint, so no localhost origin and no client secret are used.
 * The resulting short-lived access token is handed to the web layer in
 * memory only; the existing Drive / backup code stays unchanged.
 */
@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {

    private static final String TAG = "GoogleAuth";

    private static final List<Scope> SCOPES = Arrays.asList(
        new Scope("openid"),
        new Scope("email"),
        new Scope("profile"),
        new Scope("https://www.googleapis.com/auth/drive.appdata")
    );

    private ActivityResultLauncher<IntentSenderRequest> authLauncher;
    private PluginCall pendingCall;

    @Override
    public void load() {
        super.load();
        // Registered during BridgeActivity.onCreate(), before STARTED — safe.
        authLauncher = bridge.registerForActivityResult(
            new ActivityResultContracts.StartIntentSenderForResult(),
            this::handleAuthorizationResult
        );
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        if (authLauncher == null) {
            resolveError(call, "Google sign-in is not ready yet. Please try again.");
            return;
        }

        // Avoid two concurrent consent flows overwriting each other.
        if (pendingCall != null) {
            resolveCancelled(pendingCall);
        }
        pendingCall = call;

        AuthorizationRequest.Builder builder = AuthorizationRequest.builder()
            .setRequestedScopes(SCOPES);

        if (call.getBoolean("selectAccount", false)) {
            builder.setPrompt(AuthorizationRequest.Prompt.SELECT_ACCOUNT);
        }

        Task<AuthorizationResult> task = Identity.getAuthorizationClient(getActivity())
            .authorize(builder.build());

        task.addOnSuccessListener(result -> {
            if (result.hasResolution() && result.getPendingIntent() != null) {
                authLauncher.launch(new IntentSenderRequest.Builder(
                    result.getPendingIntent().getIntentSender()
                ).build());
            } else {
                finish(call, result);
            }
        }).addOnFailureListener(e -> {
            if (isCancellation(e)) resolveCancelled(call);
            else resolveError(call, messageOf(e));
        });
    }

    /** Clears the in-memory session. Native cached tokens expire on their own. */
    @PluginMethod
    public void disconnect(PluginCall call) {
        pendingCall = null;
        call.resolve();
    }

    private void handleAuthorizationResult(ActivityResult activityResult) {
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) return;

        if (activityResult.getResultCode() != Activity.RESULT_OK || activityResult.getData() == null) {
            resolveCancelled(call);
            return;
        }

        try {
            AuthorizationResult result = Identity.getAuthorizationClient(getActivity())
                .getAuthorizationResultFromIntent(activityResult.getData());
            finish(call, result);
        } catch (ApiException e) {
            if (isCancellation(e)) resolveCancelled(call);
            else resolveError(call, messageOf(e));
        } catch (Exception e) {
            resolveError(call, messageOf(e));
        }
    }

    private void finish(PluginCall call, AuthorizationResult result) {
        String token = result.getAccessToken();
        if (token == null || token.isEmpty()) {
            resolveError(call, "Google did not return an access token. Please try again.");
            return;
        }

        JSObject out = new JSObject();
        out.put("status", "success");
        out.put("accessToken", token);
        out.put("expiresIn", 3600);

        // Optional profile from Play services; the web layer falls back to the
        // userinfo endpoint when these are unavailable.
        try {
            GoogleSignInAccount account = result.toGoogleSignInAccount();
            if (account != null) {
                out.put("name", account.getDisplayName());
                out.put("email", account.getEmail());
                out.put("picture", account.getPhotoUrl() == null ? "" : account.getPhotoUrl().toString());
            }
        } catch (Throwable ignored) {
            Log.d(TAG, "Profile not available from authorization result");
        }

        call.resolve(out);
    }

    private void resolveCancelled(PluginCall call) {
        JSObject out = new JSObject();
        out.put("status", "cancelled");
        call.resolve(out);
    }

    private void resolveError(PluginCall call, String message) {
        JSObject out = new JSObject();
        out.put("status", "error");
        out.put("message", message);
        call.resolve(out);
    }

    private boolean isCancellation(Exception e) {
        if (!(e instanceof ApiException)) return false;
        int code = ((ApiException) e).getStatusCode();
        return code == CommonStatusCodes.CANCELED
            || code == CommonStatusCodes.INTERRUPTED
            || code == Activity.RESULT_CANCELED;
    }

    private String messageOf(Exception e) {
        if (e instanceof ApiException) {
            int code = ((ApiException) e).getStatusCode();
            if (code == CommonStatusCodes.NETWORK_ERROR) {
                return "A network error interrupted Google sign-in. Please try again.";
            }
            if (code == CommonStatusCodes.DEVELOPER_ERROR) {
                return "Google sign-in is misconfigured. Check the Android OAuth client (package name + SHA-1).";
            }
        }
        String msg = e.getMessage();
        return msg == null || msg.isEmpty() ? "Google sign-in could not be completed. Please try again." : msg;
    }
}
