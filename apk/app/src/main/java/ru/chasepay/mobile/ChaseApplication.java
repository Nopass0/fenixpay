package ru.chasepay.mobile;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import ru.chasepay.mobile.services.DeviceMonitorService;

public class ChaseApplication extends Application {
    private static final String TAG = "ChaseApplication";
    public static final String CHANNEL_ID = "chase_service_channel";
    
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            Log.d(TAG, "Application onCreate started");
            
            // Set up crash handler
            Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
                @Override
                public void uncaughtException(Thread thread, Throwable throwable) {
                    Log.e(TAG, "Uncaught exception: ", throwable);
                    // Let the default handler handle it
                    System.exit(1);
                }
            });
            
            // Create notification channel
            createNotificationChannelSafely();
            
            Log.d(TAG, "Application onCreate completed successfully");
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate: " + e.getMessage(), e);
            // Don't crash the app on Application onCreate
        }
    }
    
    private void createNotificationChannelSafely() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Chase Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
                );
                serviceChannel.setDescription("Chase device monitoring service");
                serviceChannel.setShowBadge(false);
                serviceChannel.setSound(null, null);
                
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(serviceChannel);
                    Log.d(TAG, "Notification channel created");
                } else {
                    Log.w(TAG, "NotificationManager is null");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error creating notification channel", e);
        }
    }
}