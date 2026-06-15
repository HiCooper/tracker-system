package com.gateflow.sdk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Response from {@code POST /api/v1/collect}.
 *
 * <p>对齐服务端 {@code EventResponse} 的实际形状 {@code {code, message, data:{accepted,duplicate,rejected,dlq}}}。
 * 此前 SDK 期望扁平 {@code {success, accepted, ...}},解析永远失败 → {@code isSuccess()} 恒 false、计数恒 0。
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class TrackResponse {

    private int code;
    private String message;
    private Data data;

    public TrackResponse() {}

    /** 服务端约定 code==200 表示成功。 */
    public boolean isSuccess() { return code == 200; }

    public int getCode() { return code; }
    public void setCode(int code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Data getData() { return data; }
    public void setData(Data data) { this.data = data; }

    public int getAccepted() { return data != null ? data.accepted : 0; }
    public int getDuplicate() { return data != null ? data.duplicate : 0; }
    public int getRejected() { return data != null ? data.rejected : 0; }
    public int getDlq() { return data != null ? data.dlq : 0; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Data {
        private int accepted;
        private int duplicate;
        private int rejected;
        private int dlq;

        public int getAccepted() { return accepted; }
        public void setAccepted(int accepted) { this.accepted = accepted; }
        public int getDuplicate() { return duplicate; }
        public void setDuplicate(int duplicate) { this.duplicate = duplicate; }
        public int getRejected() { return rejected; }
        public void setRejected(int rejected) { this.rejected = rejected; }
        public int getDlq() { return dlq; }
        public void setDlq(int dlq) { this.dlq = dlq; }
    }

    @Override
    public String toString() {
        return "TrackResponse{code=" + code + ", message=" + message +
                ", accepted=" + getAccepted() + ", duplicate=" + getDuplicate() +
                ", rejected=" + getRejected() + ", dlq=" + getDlq() + '}';
    }
}
