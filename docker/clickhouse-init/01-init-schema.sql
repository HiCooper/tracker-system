CREATE DATABASE IF NOT EXISTS gateflow_tracker;

CREATE TABLE IF NOT EXISTS gateflow_tracker.events (
    event_id       String,
    event_type     String,
    user_id        String,
    anonymous_id   String,
    session_id     String,
    timestamp      DateTime64(3),
    client_time    DateTime64(3),
    received_at    DateTime64(3) DEFAULT now64(3),
    platform       String,
    app_version    String,
    sdk_version    String,
    page_url       String,
    page_title     String,
    page_referrer  String,
    spma           String,
    spmb           String,
    spmc           String,
    spmd           String,
    device_type    String,
    os             String,
    browser        String,
    screen_width   UInt32,
    screen_height  UInt32,
    language       String,
    element_id     String,
    element_type   String,
    element_text   String,
    click_x        Nullable(Int32),
    click_y        Nullable(Int32),
    scroll_depth   Nullable(UInt8),
    stay_duration  Nullable(Int64),
    utm_source     String,
    utm_medium     String,
    utm_campaign   String,
    utm_term       String,
    utm_content    String,
    exp_ids        Array(String),
    variants       Array(String),
    properties     String
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (user_id, timestamp, event_type, session_id)
TTL toDateTime(timestamp) + toIntervalDay(90)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS gateflow_tracker.sessions (
    session_id       String,
    user_id          String,
    anonymous_id     String,
    platform         String,
    start_time       DateTime,
    end_time         Nullable(DateTime),
    duration         Nullable(Int64),
    page_views       UInt32 DEFAULT 0,
    clicks           UInt32 DEFAULT 0,
    exposures        UInt32 DEFAULT 0,
    scroll_depth_max UInt8 DEFAULT 0,
    is_bounce        UInt8 DEFAULT 0,
    first_page_url   String,
    last_page_url    String,
    utm_source       String,
    utm_medium       String,
    utm_campaign     String,
    device_type      String,
    os               String,
    last_active_at   DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(last_active_at)
PARTITION BY toYYYYMMDD(start_time)
ORDER BY (user_id, start_time)
TTL start_time + toIntervalDay(90)
SETTINGS index_granularity = 8192;
