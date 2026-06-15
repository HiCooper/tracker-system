package com.gateflow.sdk;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.gateflow.sdk.auth.AuthClient;
import com.gateflow.sdk.model.TrackEvent;
import com.gateflow.sdk.model.TrackRequest;
import com.gateflow.sdk.model.TrackResponse;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Server-side tracking client for GateFlow.
 *
 * <h3>Quick start</h3>
 * <pre>{@code
 * GateFlowClient client = GateFlowClient.builder("https://tracker.example.com", "my-app-key")
 *     .clientId("order-service")
 *     .build();
 *
 * client.track(TrackEvent.builder("order_created")
 *     .userId("user_123")
 *     .spma("myapp").spmb("b_checkout")
 *     .property("orderId", "ORD-9982")
 *     .property("amount", 299.00)
 *     .build());
 *
 * client.flush(); // send buffered events
 * client.shutdown(); // graceful shutdown
 * }</pre>
 *
 * <h3>Thread safety</h3>
 * All public methods are thread-safe. The client uses an internal queue
 * with a background flusher thread.
 */
public class GateFlowClient {

    private static final Logger LOG = Logger.getLogger(GateFlowClient.class.getName());

    public static final int DEFAULT_BATCH_SIZE = 20;
    public static final int DEFAULT_FLUSH_INTERVAL_SEC = 5;
    public static final int DEFAULT_MAX_RETRIES = 3;
    public static final int DEFAULT_QUEUE_CAPACITY = 10_000;

    private final String collectUrl;
    private final String clientId;
    private final int batchSize;
    private final int maxRetries;
    private final HttpClient http;
    private final ObjectMapper mapper;
    private final AuthClient auth;
    private final BlockingQueue<TrackEvent> queue;
    private final ScheduledExecutorService scheduler;
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final Consumer<TrackResponse> onResponse;
    private final Consumer<Throwable> onError;

    private GateFlowClient(Builder builder) {
        this.collectUrl = builder.baseUrl.replaceAll("/$", "") + "/api/v1/collect";
        this.clientId = builder.clientId;
        this.batchSize = builder.batchSize;
        this.maxRetries = builder.maxRetries;
        this.onResponse = builder.onResponse;
        this.onError = builder.onError;
        this.queue = new LinkedBlockingQueue<>(builder.queueCapacity);

        this.mapper = new ObjectMapper();
        this.mapper.registerModule(new JavaTimeModule());

        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(builder.connectTimeoutSec))
                .build();

        this.auth = builder.appKey != null ? new AuthClient(builder.baseUrl, builder.appKey) : null;

        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "gateflow-flusher");
            t.setDaemon(true);
            return t;
        });

        // Background flush
        scheduler.scheduleAtFixedRate(
                this::flushInternal,
                builder.flushIntervalSec,
                builder.flushIntervalSec,
                TimeUnit.SECONDS
        );
    }

    // ============ Public API ============

    /**
     * Enqueue a single event. Non-blocking — the event will be sent
     * in the next batch flush.
     *
     * @return true if the event was enqueued, false if the queue is full
     */
    public boolean track(TrackEvent event) {
        if (!running.get()) {
            LOG.warning("Client is shut down, discarding event: " + event.getEventType());
            return false;
        }
        boolean ok = queue.offer(event);
        if (!ok) {
            LOG.warning("Queue full (" + queue.size() + "), discarding event: " + event.getEventType());
            if (onError != null) {
                onError.accept(new IllegalStateException("Queue full"));
            }
        }
        return ok;
    }

    /**
     * Enqueue multiple events.
     * @return count of successfully enqueued events
     */
    public int trackAll(List<TrackEvent> events) {
        int count = 0;
        for (TrackEvent e : events) {
            if (track(e)) count++;
        }
        return count;
    }

    /**
     * Immediately send all buffered events (synchronous).
     * @return summary of what was sent
     */
    public FlushResult flush() {
        return flushInternal();
    }

    /**
     * Graceful shutdown — flushes remaining events and stops the background thread.
     */
    public void shutdown() {
        running.set(false);
        scheduler.shutdown();
        flushInternal();
        try {
            if (!scheduler.awaitTermination(10, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    /** Approximate number of buffered events. */
    public int queueSize() {
        return queue.size();
    }

    // ============ Internal ============

    private FlushResult flushInternal() {
        if (queue.isEmpty()) return new FlushResult(0, 0, 0, 0);

        List<TrackEvent> batch = new ArrayList<>(batchSize);
        queue.drainTo(batch, batchSize);
        if (batch.isEmpty()) return new FlushResult(0, 0, 0, 0);

        int totalSent = 0, totalDup = 0, totalRej = 0;
        int batches = 0;

        // Split into sub-batches
        for (int i = 0; i < batch.size(); i += batchSize) {
            int end = Math.min(i + batchSize, batch.size());
            List<TrackEvent> sub = batch.subList(i, end);
            TrackRequest req = new TrackRequest(sub, clientId);

            // Retry loop
            for (int attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    TrackResponse resp = send(req);
                    totalSent += resp.getAccepted();
                    totalDup += resp.getDuplicate();
                    totalRej += resp.getRejected();
                    batches++;
                    if (onResponse != null) onResponse.accept(resp);
                    break;
                } catch (Exception e) {
                    if (attempt == maxRetries) {
                        LOG.log(Level.WARNING, "Failed to send batch after " + maxRetries + " attempts", e);
                        totalRej += sub.size();
                        if (onError != null) onError.accept(e);
                    } else {
                        long backoff = (long) Math.pow(2, attempt) * 100; // 200, 400, 800ms
                        try { Thread.sleep(backoff); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
                    }
                }
            }
        }

        if (LOG.isLoggable(Level.FINE)) {
            LOG.fine("Flushed " + batch.size() + " events in " + batches + " batches — "
                    + totalSent + " accepted, " + totalDup + " dup, " + totalRej + " rejected");
        }
        return new FlushResult(batch.size(), totalSent, totalDup, totalRej);
    }

    private TrackResponse send(TrackRequest request) throws Exception {
        // 映射为服务端契约的嵌套结构(epoch-millis 时间戳),而非直接序列化扁平 TrackEvent。
        String body = mapper.writeValueAsString(
                com.gateflow.sdk.model.CollectRequest.from(request.getEvents(), request.getClientId()));

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(collectUrl))
                .header("Content-Type", "application/json")
                .header("X-Timestamp", String.valueOf(System.currentTimeMillis()))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(30));

        if (auth != null) {
            reqBuilder.header("X-Sdk-Token", auth.getToken());
        }

        HttpResponse<String> resp = http.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() == 429) {
            throw new IOException("Rate limited: " + resp.body());
        }
        if (resp.statusCode() >= 500) {
            throw new IOException("Server error " + resp.statusCode() + ": " + resp.body());
        }
        if (resp.statusCode() == 401 && auth != null) {
            auth.invalidate();
            throw new IOException("Auth expired, token refreshed");
        }
        if (resp.statusCode() >= 400) {
            LOG.warning("Client error " + resp.statusCode() + ": " + resp.body());
            return new TrackResponse(); // don't retry client errors
        }
        return mapper.readValue(resp.body(), TrackResponse.class);
    }

    // ============ Result ============

    public static class FlushResult {
        public final int attempted;
        public final int accepted;
        public final int duplicate;
        public final int rejected;

        FlushResult(int a, int s, int d, int r) { attempted = a; accepted = s; duplicate = d; rejected = r; }

        @Override
        public String toString() {
            return "FlushResult{attempted=" + attempted + ", accepted=" + accepted
                    + ", dup=" + duplicate + ", rejected=" + rejected + '}';
        }
    }

    static class IOException extends Exception {
        IOException(String msg) { super(msg); }
    }

    // ============ Builder ============

    public static Builder builder(String baseUrl, String appKey) {
        return new Builder(baseUrl, appKey);
    }

    /** Builder for local dev — no auth, events go to localhost. */
    public static Builder builderLocalhost() {
        return new Builder("http://localhost:8080", null);
    }

    public static class Builder {
        private final String baseUrl;
        private final String appKey;
        private String clientId = "sdk-default";
        private int batchSize = DEFAULT_BATCH_SIZE;
        private int flushIntervalSec = DEFAULT_FLUSH_INTERVAL_SEC;
        private int maxRetries = DEFAULT_MAX_RETRIES;
        private int queueCapacity = DEFAULT_QUEUE_CAPACITY;
        private int connectTimeoutSec = 5;
        private Consumer<TrackResponse> onResponse;
        private Consumer<Throwable> onError;

        private Builder(String baseUrl, String appKey) {
            this.baseUrl = baseUrl;
            this.appKey = appKey;
        }

        public Builder clientId(String v) { clientId = v; return this; }
        public Builder batchSize(int v) { batchSize = v; return this; }
        public Builder flushIntervalSec(int v) { flushIntervalSec = v; return this; }
        public Builder maxRetries(int v) { maxRetries = v; return this; }
        public Builder queueCapacity(int v) { queueCapacity = v; return this; }
        public Builder connectTimeoutSec(int v) { connectTimeoutSec = v; return this; }
        public Builder onResponse(Consumer<TrackResponse> v) { onResponse = v; return this; }
        public Builder onError(Consumer<Throwable> v) { onError = v; return this; }

        public GateFlowClient build() {
            return new GateFlowClient(this);
        }
    }
}
