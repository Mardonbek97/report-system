package com.example.report_system.dto;

public class ScheduleDto {
    private String  id;
    private String  repId;
    private String  repName;
    private Long    userId;
    private String  username;
    private String  params;
    private String  fileFormat;
    private String  cronExpr;
    private String  runAt;
    private boolean active;
    private String  lastRun;
    private String  lastStatus;
    private String  lastError;
    private String  lastFile;

    public ScheduleDto() {}

    // Getters & Setters
    public String  getId()          { return id; }
    public void    setId(String v)  { this.id = v; }
    public String  getRepId()       { return repId; }
    public void    setRepId(String v){ this.repId = v; }
    public String  getRepName()     { return repName; }
    public void    setRepName(String v){ this.repName = v; }
    public Long    getUserId()      { return userId; }
    public void    setUserId(Long v){ this.userId = v; }
    public String  getUsername()    { return username; }
    public void    setUsername(String v){ this.username = v; }
    public String  getParams()      { return params; }
    public void    setParams(String v){ this.params = v; }
    public String  getFileFormat()  { return fileFormat; }
    public void    setFileFormat(String v){ this.fileFormat = v; }
    public String  getCronExpr()    { return cronExpr; }
    public void    setCronExpr(String v){ this.cronExpr = v; }
    public String  getRunAt()       { return runAt; }
    public void    setRunAt(String v){ this.runAt = v; }
    public boolean isActive()       { return active; }
    public void    setActive(boolean v){ this.active = v; }
    public String  getLastRun()     { return lastRun; }
    public void    setLastRun(String v){ this.lastRun = v; }
    public String  getLastStatus()  { return lastStatus; }
    public void    setLastStatus(String v){ this.lastStatus = v; }
    public String  getLastError()   { return lastError; }
    public void    setLastError(String v){ this.lastError = v; }
    public String  getLastFile()    { return lastFile; }
    public void    setLastFile(String v){ this.lastFile = v; }
}