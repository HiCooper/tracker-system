package com.gateflow.sdk.auth;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Exchanges an appKey for a JWT token from the tracker-service auth endpoint.
 * Token is cached and auto-refreshed before expiry.
 */
public class AuthClient {

    private final String authUrl;
    private final String appKey;
    private final HttpClient http;
    private final ObjectMapper mapper;

    private volatile String token;
    private volatile long expiresAt; // epoch millis

    public AuthClient(String baseUrl, String appKey) {
        this.authUrl = baseUrl.replaceAll("/$", "") + "/api/v1/collect/auth";
        this.appKey = appKey;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.mapper = new ObjectMapper();
    }

    /**
     * Returns a valid token, refreshing if absent or within 60s of expiry.
     */
    public String getToken() {
        if (token != null && System.currentTimeMillis() < expiresAt - 60_000) {
            return token;
        }
        synchronized (this) {
            if (token != null && System.currentTimeMillis() < expiresAt - 60_000) {
                return token;
            }
            try {
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(authUrl))
                        .header("Content-Type", "application/json")
                        .header("X-App-Key", appKey)
                        .POST(HttpRequest.BodyPublishers.ofString("{}"))
                        .timeout(Duration.ofSeconds(10))
                        .build();

                HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
                if (resp.statusCode() == 200) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> body = mapper.readValue(resp.body(), Map.class);
                    token = (String) body.get("sdkToken");
                    Object exp = body.get("expiresIn");
                    long expiresIn = exp instanceof Number ? ((Number) exp).longValue() : 3600;
                    expiresAt = System.currentTimeMillis() + expiresIn * 1000;
                    return token;
                }
                throw new RuntimeException("Auth failed: HTTP " + resp.statusCode() + " " + resp.body());
            } catch (RuntimeException e) {
                throw e;
            } catch (Exception e) {
                throw new RuntimeException("Auth failed: " + e.getMessage(), e);
            }
        }
    }

    /** Async version. */
    public CompletableFuture<String> getTokenAsync() {
        return CompletableFuture.supplyAsync(this::getToken);
    }

    /** Force token refresh on next getToken(). */
    public void invalidate() {
        synchronized (this) {
            token = null;
            expiresAt = 0;
        }
    }
}
