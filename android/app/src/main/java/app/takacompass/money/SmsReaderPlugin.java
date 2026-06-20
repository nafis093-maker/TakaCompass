package app.takacompass.money;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Reads the SMS inbox and streams incoming SMS to JS so Taka Compass can parse
 * bank / MFS transaction messages into transactions.
 */
@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS })
    }
)
public class SmsReaderPlugin extends Plugin {

    private BroadcastReceiver receiver;

    @PluginMethod
    public void smsPermissionState(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSmsPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
        } else {
            requestPermissionForAlias("sms", call, "smsPermCallback");
        }
    }

    @PermissionCallback
    private void smsPermCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void readInbox(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission not granted");
            return;
        }
        int days = call.getInt("days", 90);
        int max = call.getInt("max", 500);
        long since = System.currentTimeMillis() - (long) days * 24L * 3600L * 1000L;

        JSArray messages = new JSArray();
        Uri uri = Uri.parse("content://sms/inbox");
        String[] proj = { "address", "body", "date" };
        Cursor c = null;
        try {
            c = getContext().getContentResolver().query(uri, proj, "date>=?", new String[]{ String.valueOf(since) }, "date DESC");
            if (c != null) {
                int ai = c.getColumnIndex("address");
                int bi = c.getColumnIndex("body");
                int di = c.getColumnIndex("date");
                int count = 0;
                while (c.moveToNext() && count < max) {
                    JSObject m = new JSObject();
                    m.put("address", ai >= 0 ? c.getString(ai) : "");
                    m.put("body", bi >= 0 ? c.getString(bi) : "");
                    m.put("date", di >= 0 ? c.getLong(di) : 0);
                    messages.put(m);
                    count++;
                }
            }
        } catch (Exception e) {
            call.reject("Could not read inbox: " + e.getMessage());
            return;
        } finally {
            if (c != null) c.close();
        }
        JSObject ret = new JSObject();
        ret.put("messages", messages);
        call.resolve(ret);
    }

    @PluginMethod
    public void startWatching(PluginCall call) {
        if (receiver != null) { call.resolve(); return; }
        receiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
                if (msgs == null) return;
                StringBuilder body = new StringBuilder();
                String address = "";
                for (SmsMessage sm : msgs) {
                    if (sm == null) continue;
                    body.append(sm.getMessageBody());
                    address = sm.getOriginatingAddress();
                }
                JSObject data = new JSObject();
                data.put("address", address == null ? "" : address);
                data.put("body", body.toString());
                data.put("date", System.currentTimeMillis());
                notifyListeners("smsReceived", data);
            }
        };
        IntentFilter filter = new IntentFilter("android.provider.Telephony.SMS_RECEIVED");
        if (Build.VERSION.SDK_INT >= 34) {
            getContext().registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(receiver, filter);
        }
        call.resolve();
    }

    @PluginMethod
    public void stopWatching(PluginCall call) {
        unregister();
        call.resolve();
    }

    private void unregister() {
        if (receiver != null) {
            try { getContext().unregisterReceiver(receiver); } catch (Exception ignored) {}
            receiver = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        unregister();
    }
}
