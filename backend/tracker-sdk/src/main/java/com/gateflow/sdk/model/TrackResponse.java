package com.gateflow.sdk.model;

/** Response from {@code POST /api/v1/collect}. */
public class TrackResponse {

    private boolean success;
    private int accepted;
    private int duplicate;
    private int rejected;
    private String error;

    public TrackResponse() {}

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public int getAccepted() { return accepted; }
    public void setAccepted(int accepted) { this.accepted = accepted; }
    public int getDuplicate() { return duplicate; }
    public void setDuplicate(int duplicate) { this.duplicate = duplicate; }
    public int getRejected() { return rejected; }
    public void setRejected(int rejected) { this.rejected = rejected; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    @Override
    public String toString() {
        return "TrackResponse{success=" + success + ", accepted=" + accepted +
                ", duplicate=" + duplicate + ", rejected=" + rejected +
                (error != null ? ", error=" + error : "") + '}';
    }
}
