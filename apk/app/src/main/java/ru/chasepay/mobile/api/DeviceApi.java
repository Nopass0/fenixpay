package ru.chasepay.mobile.api;

import ru.chasepay.mobile.models.AppVersion;
import ru.chasepay.mobile.models.ConnectRequest;
import ru.chasepay.mobile.models.ConnectResponse;
import ru.chasepay.mobile.models.DeviceInfoRequest;
import ru.chasepay.mobile.models.NotificationRequest;
import ru.chasepay.mobile.models.PingResponse;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.POST;

public interface DeviceApi {
    @GET("device/ping")
    Call<PingResponse> ping();
    
    @GET("device/ping")
    Call<PingResponse> pingWithToken(@Header("x-device-token") String token);
    
    @POST("device/connect")
    Call<ConnectResponse> connect(@Body ConnectRequest request);
    
    @POST("device/info/update")
    Call<Void> updateInfo(@Header("Authorization") String token, 
                         @Body DeviceInfoRequest request);
    
    @POST("device/notification")
    Call<Void> sendNotification(@Header("Authorization") String token,
                               @Body NotificationRequest request);
    
    @GET("app/version")
    Call<AppVersion> getLatestVersion();
}