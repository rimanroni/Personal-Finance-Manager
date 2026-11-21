package com.personalfinance.manager;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register before super.onCreate(): BridgeActivity builds the bridge
        // (and loads plugins) inside onCreate().
        registerPlugin(GoogleAuthPlugin.class);
        registerPlugin(AppPermissionsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
