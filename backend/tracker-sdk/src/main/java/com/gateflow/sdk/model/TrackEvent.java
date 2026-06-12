package com.gateflow.sdk.model;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * A single tracking event, built via the fluent {@link Builder}.
 *
 * <pre>{@code
 * TrackEvent event = TrackEvent.builder("purchase")
 *     .userId("user_123")
 *     .spma("myapp").spmb("b_checkout").spmc("order").spmd("confirm")
 *     .property("orderId", "ORD-9982")
 *     .property("amount", 299.00)
 *     .build();
 * }</pre>
 */
public class TrackEvent {

    private final String eventId;
    private final String eventType;
    private final String userId;
    private final String anonymousId;
    private final String sessionId;
    private final Instant timestamp;
    private final String spma, spmb, spmc, spmd;
    private final String pageUrl, pageTitle, pageReferrer;
    private final String platform, deviceType, os, browser;
    private final Integer screenWidth, screenHeight;
    private final String language;
    private final String elementId, elementType, elementText;
    private final String utmSource, utmMedium, utmCampaign;
    private final Map<String, Object> properties;

    private TrackEvent(Builder b) {
        this.eventId = b.eventId != null ? b.eventId : "evt_" + UUID.randomUUID().toString().replace("-", "");
        this.eventType = b.eventType;
        this.userId = b.userId;
        this.anonymousId = b.anonymousId;
        this.sessionId = b.sessionId;
        this.timestamp = b.timestamp != null ? b.timestamp : Instant.now();
        this.spma = b.spma; this.spmb = b.spmb; this.spmc = b.spmc; this.spmd = b.spmd;
        this.pageUrl = b.pageUrl; this.pageTitle = b.pageTitle; this.pageReferrer = b.pageReferrer;
        this.platform = b.platform != null ? b.platform : "server";
        this.deviceType = b.deviceType; this.os = b.os; this.browser = b.browser;
        this.screenWidth = b.screenWidth; this.screenHeight = b.screenHeight;
        this.language = b.language;
        this.elementId = b.elementId; this.elementType = b.elementType; this.elementText = b.elementText;
        this.utmSource = b.utmSource; this.utmMedium = b.utmMedium; this.utmCampaign = b.utmCampaign;
        this.properties = b.properties != null ? new HashMap<>(b.properties) : new HashMap<>();
    }

    // -- getters --
    public String getEventId() { return eventId; }
    public String getEventType() { return eventType; }
    public String getUserId() { return userId; }
    public String getAnonymousId() { return anonymousId; }
    public String getSessionId() { return sessionId; }
    public Instant getTimestamp() { return timestamp; }
    public String getSpma() { return spma; }
    public String getSpmb() { return spmb; }
    public String getSpmc() { return spmc; }
    public String getSpmd() { return spmd; }
    public String getPageUrl() { return pageUrl; }
    public String getPageTitle() { return pageTitle; }
    public String getPageReferrer() { return pageReferrer; }
    public String getPlatform() { return platform; }
    public String getDeviceType() { return deviceType; }
    public String getOs() { return os; }
    public String getBrowser() { return browser; }
    public Integer getScreenWidth() { return screenWidth; }
    public Integer getScreenHeight() { return screenHeight; }
    public String getLanguage() { return language; }
    public String getElementId() { return elementId; }
    public String getElementType() { return elementType; }
    public String getElementText() { return elementText; }
    public String getUtmSource() { return utmSource; }
    public String getUtmMedium() { return utmMedium; }
    public String getUtmCampaign() { return utmCampaign; }
    public Map<String, Object> getProperties() { return properties; }

    /** Create a builder with the required eventType. */
    public static Builder builder(String eventType) {
        return new Builder(eventType);
    }

    public static class Builder {
        private String eventId;
        private final String eventType;
        private String userId, anonymousId, sessionId;
        private Instant timestamp;
        private String spma, spmb, spmc, spmd;
        private String pageUrl, pageTitle, pageReferrer;
        private String platform, deviceType, os, browser;
        private Integer screenWidth, screenHeight;
        private String language;
        private String elementId, elementType, elementText;
        private String utmSource, utmMedium, utmCampaign;
        private Map<String, Object> properties;

        private Builder(String eventType) {
            if (eventType == null || eventType.isBlank())
                throw new IllegalArgumentException("eventType is required");
            this.eventType = eventType;
        }

        public Builder eventId(String v) { eventId = v; return this; }
        public Builder userId(String v) { userId = v; return this; }
        public Builder anonymousId(String v) { anonymousId = v; return this; }
        public Builder sessionId(String v) { sessionId = v; return this; }
        public Builder timestamp(Instant v) { timestamp = v; return this; }
        public Builder spma(String v) { spma = v; return this; }
        public Builder spmb(String v) { spmb = v; return this; }
        public Builder spmc(String v) { spmc = v; return this; }
        public Builder spmd(String v) { spmd = v; return this; }
        public Builder pageUrl(String v) { pageUrl = v; return this; }
        public Builder pageTitle(String v) { pageTitle = v; return this; }
        public Builder pageReferrer(String v) { pageReferrer = v; return this; }
        public Builder platform(String v) { platform = v; return this; }
        public Builder deviceType(String v) { deviceType = v; return this; }
        public Builder os(String v) { os = v; return this; }
        public Builder browser(String v) { browser = v; return this; }
        public Builder screenWidth(Integer v) { screenWidth = v; return this; }
        public Builder screenHeight(Integer v) { screenHeight = v; return this; }
        public Builder language(String v) { language = v; return this; }
        public Builder elementId(String v) { elementId = v; return this; }
        public Builder elementType(String v) { elementType = v; return this; }
        public Builder elementText(String v) { elementText = v; return this; }
        public Builder utmSource(String v) { utmSource = v; return this; }
        public Builder utmMedium(String v) { utmMedium = v; return this; }
        public Builder utmCampaign(String v) { utmCampaign = v; return this; }
        public Builder property(String k, Object v) {
            if (properties == null) properties = new HashMap<>();
            properties.put(k, v);
            return this;
        }
        public Builder properties(Map<String, Object> v) { properties = v; return this; }
        public TrackEvent build() { return new TrackEvent(this); }
    }
}
