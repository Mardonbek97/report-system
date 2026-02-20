package com.example.report_system.entity;

import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
public class RepAccessId implements Serializable {

    private Long userId;
    private UUID repId;

    public UUID getRepId() {
        return repId;
    }

    public void setRepId(UUID repId) {
        this.repId = repId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
