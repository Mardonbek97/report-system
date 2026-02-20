package com.example.report_system.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@IdClass(RepAccessId.class)
@Table(name = "REP_CORE_ACCESS")
public class RepAccess {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "rep_id")
    private UUID repId;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("repId")
    @JoinColumn(name = "rep_id", nullable = false, columnDefinition = "RAW(16)")
    private Reports reports;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private Users users;

    private String salaryAccess;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Reports getReports() {
        return reports;
    }

    public void setReports(Reports reports) {
        this.reports = reports;
    }

    public String getSalaryAccess() {
        return salaryAccess;
    }

    public void setSalaryAccess(String salaryAccess) {
        this.salaryAccess = salaryAccess;
    }

    public Users getUsers() {
        return users;
    }

    public void setUsers(Users users) {
        this.users = users;
    }
}
