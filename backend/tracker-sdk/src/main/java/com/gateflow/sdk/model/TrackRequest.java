package com.gateflow.sdk.model;

import java.util.List;

/** Batch tracking request — matches {@code POST /api/v1/collect} contract. */
public class TrackRequest {

    private List<TrackEvent> events;
    private String clientId;

    public TrackRequest() {}

    public TrackRequest(List<TrackEvent> events, String clientId) {
        this.events = events;
        this.clientId = clientId;
    }

    public List<TrackEvent> getEvents() { return events; }
    public void setEvents(List<TrackEvent> events) { this.events = events; }
    public String getClientId() { return clientId; }
    public void setClientId(String clientId) { this.clientId = clientId; }
}
