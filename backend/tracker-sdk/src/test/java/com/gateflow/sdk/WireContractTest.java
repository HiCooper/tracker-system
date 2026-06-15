package com.gateflow.sdk;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gateflow.sdk.model.CollectRequest;
import com.gateflow.sdk.model.TrackEvent;
import com.gateflow.sdk.model.TrackResponse;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 验证 SDK 与服务端 {@code /api/v1/collect} 的线上契约:
 * 请求为嵌套结构 + epoch-millis 时间戳;响应按 {@code {code,message,data}} 解析。
 */
class WireContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void mapsFlatEventToNestedWireShape() throws Exception {
        Instant ts = Instant.parse("2026-06-15T07:00:00Z");
        TrackEvent event = TrackEvent.builder("purchase")
                .userId("u1").anonymousId("a1").sessionId("s1").timestamp(ts)
                .spma("app").spmb("checkout")
                .pageUrl("https://x/checkout").pageTitle("Checkout")
                .deviceType("mobile").os("Android").screenWidth(1080).language("zh-CN")
                .utmSource("wechat")
                .elementId("btn").property("orderId", "ORD-1")
                .build();

        JsonNode root = mapper.valueToTree(CollectRequest.from(List.of(event), "svc"));
        JsonNode e = root.get("events").get(0);

        assertEquals("svc", root.get("clientId").asText());
        // epoch-millis 数字,而非 ISO 字符串
        assertTrue(e.get("timestamp").isNumber());
        assertEquals(ts.toEpochMilli(), e.get("timestamp").asLong());
        // 嵌套结构
        assertEquals("https://x/checkout", e.get("page").get("url").asText());
        assertEquals("s1", e.get("session").get("sessionId").asText());
        assertEquals(1080, e.get("device").get("screenWidth").asInt());
        assertEquals("wechat", e.get("context").get("utmSource").asText());
        assertEquals("btn", e.get("data").get("elementId").asText());
        // spm / deviceType / os 折叠进 custom,避免丢失
        JsonNode custom = e.get("data").get("custom");
        assertEquals("ORD-1", custom.get("orderId").asText());
        assertEquals("app", custom.get("spma").asText());
        assertEquals("mobile", custom.get("deviceType").asText());
        assertEquals("Android", custom.get("os").asText());
    }

    @Test
    void parsesServerResponseShape() throws Exception {
        String json = "{\"code\":200,\"message\":\"success\"," +
                "\"data\":{\"accepted\":3,\"duplicate\":1,\"rejected\":0,\"dlq\":0}}";
        TrackResponse resp = mapper.readValue(json, TrackResponse.class);

        assertTrue(resp.isSuccess());
        assertEquals(3, resp.getAccepted());
        assertEquals(1, resp.getDuplicate());
        assertEquals(0, resp.getRejected());
    }

    @Test
    void endToEndSendUsesNestedBodyAndParsesResponse() throws Exception {
        AtomicReference<String> captured = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/v1/collect", exchange -> {
            try (InputStream in = exchange.getRequestBody()) {
                captured.set(new String(in.readAllBytes(), StandardCharsets.UTF_8));
            }
            byte[] body = "{\"code\":200,\"message\":\"success\",\"data\":{\"accepted\":1,\"duplicate\":0,\"rejected\":0,\"dlq\":0}}"
                    .getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        try {
            String baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
            GateFlowClient client = GateFlowClient.builder(baseUrl, null)
                    .clientId("svc").flushIntervalSec(60).maxRetries(1).build();

            client.track(TrackEvent.builder("page_view").userId("u1").build());
            GateFlowClient.FlushResult result = client.flush();
            client.shutdown();

            assertEquals(1, result.accepted);
            JsonNode sent = mapper.readTree(captured.get());
            assertEquals("svc", sent.get("clientId").asText());
            assertTrue(sent.get("events").get(0).get("timestamp").isNumber());
            assertEquals("page_view", sent.get("events").get(0).get("eventType").asText());
        } finally {
            server.stop(0);
        }
    }
}
