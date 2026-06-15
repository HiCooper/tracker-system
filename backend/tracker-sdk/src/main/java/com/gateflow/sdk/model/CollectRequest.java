package com.gateflow.sdk.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 服务端 {@code POST /api/v1/collect} 的线上契约(嵌套结构 + epoch-millis 时间戳)。
 *
 * <p>SDK 内部使用扁平的 {@link TrackEvent},发送前由 {@link #from(List, String)} 映射为本类,
 * 与服务端 {@code EventDTO}(page/session/device/context/data 嵌套)对齐。此前直接序列化扁平
 * {@code TrackEvent} + ISO 时间戳,服务端解析失败导致字段全丢。
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CollectRequest {

    /** SDK 版本标识,随事件上报。 */
    public static final String SDK_VERSION = "java-sdk/1.0.0";

    private final List<Event> events;
    private final String clientId;

    private CollectRequest(List<Event> events, String clientId) {
        this.events = events;
        this.clientId = clientId;
    }

    public static CollectRequest from(List<TrackEvent> source, String clientId) {
        List<Event> mapped = new ArrayList<>(source.size());
        for (TrackEvent e : source) {
            mapped.add(toEvent(e));
        }
        return new CollectRequest(mapped, clientId);
    }

    private static Event toEvent(TrackEvent e) {
        Event w = new Event();
        w.eventId = e.getEventId();
        w.eventType = e.getEventType();
        w.userId = e.getUserId();
        w.anonymousId = e.getAnonymousId();
        w.timestamp = e.getTimestamp() != null ? e.getTimestamp().toEpochMilli() : System.currentTimeMillis();
        w.clientTime = w.timestamp;
        w.platform = e.getPlatform();
        w.sdkVersion = SDK_VERSION;

        w.page = Page.of(e.getPageUrl(), e.getPageTitle(), e.getPageReferrer());
        w.session = e.getSessionId() != null ? new Session(e.getSessionId()) : null;
        w.device = Device.of(e.getScreenWidth(), e.getScreenHeight(), e.getLanguage());
        w.context = Context.of(e.getUtmSource(), e.getUtmMedium(), e.getUtmCampaign());
        w.data = Data.of(e);
        return w;
    }

    public List<Event> getEvents() { return events; }
    public String getClientId() { return clientId; }

    // ── nested wire shapes (mirror server EventDTO) ──

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Event {
        public String eventId;
        public String eventType;
        public String userId;
        public String anonymousId;
        public Long timestamp;
        public Long clientTime;
        public String platform;
        public String sdkVersion;
        public Page page;
        public Session session;
        public Device device;
        public Context context;
        public Data data;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Page {
        public String url;
        public String title;
        public String referrer;
        static Page of(String url, String title, String referrer) {
            if (url == null && title == null && referrer == null) return null;
            Page p = new Page();
            p.url = url; p.title = title; p.referrer = referrer;
            return p;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Session {
        public String sessionId;
        Session(String sessionId) { this.sessionId = sessionId; }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Device {
        public Integer screenWidth;
        public Integer screenHeight;
        public String language;
        static Device of(Integer w, Integer h, String lang) {
            if (w == null && h == null && lang == null) return null;
            Device d = new Device();
            d.screenWidth = w; d.screenHeight = h; d.language = lang;
            return d;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Context {
        public String utmSource;
        public String utmMedium;
        public String utmCampaign;
        static Context of(String s, String m, String c) {
            if (s == null && m == null && c == null) return null;
            Context ctx = new Context();
            ctx.utmSource = s; ctx.utmMedium = m; ctx.utmCampaign = c;
            return ctx;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Data {
        public String elementId;
        public String elementType;
        public String elementText;
        public Map<String, Object> custom;

        static Data of(TrackEvent e) {
            Data d = new Data();
            d.elementId = e.getElementId();
            d.elementType = e.getElementType();
            d.elementText = e.getElementText();
            // 服务端 EventDTO 无 spm / deviceType / os / browser 字段:折叠进 custom,避免丢失。
            Map<String, Object> custom = new LinkedHashMap<>();
            if (e.getProperties() != null) custom.putAll(e.getProperties());
            putIfPresent(custom, "spma", e.getSpma());
            putIfPresent(custom, "spmb", e.getSpmb());
            putIfPresent(custom, "spmc", e.getSpmc());
            putIfPresent(custom, "spmd", e.getSpmd());
            putIfPresent(custom, "deviceType", e.getDeviceType());
            putIfPresent(custom, "os", e.getOs());
            putIfPresent(custom, "browser", e.getBrowser());
            d.custom = custom.isEmpty() ? null : custom;
            if (d.elementId == null && d.elementType == null && d.elementText == null && d.custom == null) {
                return null;
            }
            return d;
        }

        private static void putIfPresent(Map<String, Object> map, String key, Object value) {
            if (value != null) map.put(key, value);
        }
    }
}
