# Oracle Report System

A full-stack reporting platform built for Oracle 11g+ databases. It executes parameterized stored procedures, parses JSON output via Global Temporary Tables, and delivers results as downloadable Excel/Word/ZIP files — with scheduling, access control, and a modern React dashboard.

---

## Architecture Overview

```
React (Vite)  ──►  Spring Boot (REST API)  ──►  Oracle 11g+
     │                      │                        │
  Dashboard             JWT Security            Stored Procedures
  Schedules             GTT Pipeline            JSON via VARCHAR
  File Download         File Export             REP_CORE_* Tables
```

---

## How It Works

### Oracle Side — JSON Parsing via GTT

Oracle 11g does not have native JSON support. This system works around that constraint using a **Global Temporary Table (GTT)** pipeline:

1. The stored procedure accepts input parameters and writes output rows as a JSON string into a `VARCHAR2` column of a GTT (`ON COMMIT DELETE ROWS`)
2. The Java backend reads from the GTT **within the same connection and transaction** — critical because GTT data is session-scoped
3. The JSON string is parsed on the Java side using Jackson, then mapped to the report template

```sql
-- Simplified GTT flow
INSERT INTO TMP_REPORT_OUTPUT (json_data)
VALUES ('{"rows": [{"col1": "val1", "col2": "val2"}]}');

-- Java reads this within the same connection
SELECT json_data FROM TMP_REPORT_OUTPUT;
```

> ⚠️ **GTT Safety Rule**: All GTT operations (insert → procedure call → read) must use a **single `Connection` object**. Spring's connection pool will hand out different connections per call — breaking GTT isolation. All GTT services use raw `DataSource.getConnection()` directly, bypassing JPA/JdbcTemplate connection management.

### Java Side — Spring Boot

- **`ReportExecZipService`** — core execution engine; manages the GTT pipeline using a single `Connection`, calls the Oracle procedure, reads JSON output, and generates the file
- **`ExcelUploadService`** — parses `.xlsx` template files to extract parameter definitions and report metadata
- **`SchedulerService`** — `@Scheduled(fixedDelay=60_000)` polls for due one-time and cron-based schedules every minute
- **Repository layer** — all SQL is in `*RepositoryCustom` classes using `JdbcTemplate`/raw JDBC; services contain only business logic
- **Pagination** — Oracle 11g does not support `LIMIT/OFFSET`; all paginated queries use the `ROWNUM` double-subquery pattern:

```sql
SELECT * FROM (
  SELECT t.*, ROWNUM rn FROM (
    SELECT ... FROM table ORDER BY col DESC
  ) t WHERE ROWNUM <= :rownumMax
) WHERE rn > :offset
```

### React Frontend (Vite)

| Page | Description |
|---|---|
| `Login` | JWT authentication |
| `UsersPage` | Admin: create, block/unblock users |
| `ReportsPage` | Admin: assign reports to users |
| `GenerateReportPage` | User: fill parameters, run report, download file |
| `ScheduledLogsPage` | View, toggle, and delete scheduled reports |

All API calls go through a centralized `api.js` utility that injects the JWT Bearer token and reads the base URL from `VITE_API_BASE` environment variable.

---

## Report Execution Flow

```
1. User selects report and fills parameters
2. POST /api/reports/generate  →  ReportExecZipService.executeAndExportZip()
3. Open single DB connection
4. Call Oracle stored procedure with params
5. Procedure writes JSON rows into GTT
6. Java reads GTT → parses JSON → fills .xlsx/.docx template
7. File written to server disk
8. GET /api/reports/download  →  file streamed to browser
```

---

## Scheduling

Two schedule types are supported:

| Type | Field | Behavior |
|---|---|---|
| **One-time** | `run_at` (timestamp) | Runs once when time is reached, then deactivated |
| **Recurring** | `cron_expr` (5-field cron) | Runs on each matching minute tick |

Cron expressions follow standard 5-field format (`0 8 * * MON-FRI`). The scheduler converts them to Spring's 6-field format internally before evaluation.

Executed files are stored under `{scheduled-reports.dir}/{username}/` and are available for download from the Scheduled Logs page.

---

## Database Schema (Core Tables)

```sql
REP_CORE_USERS      -- Users, roles, status
REP_CORE_NAME       -- Report definitions and template paths
REP_CORE_ACCESS     -- User ↔ Report access mapping
REP_CORE_SCHEDULE   -- Schedule metadata (cron, params, last run, file path)
REP_CORE_LOGS       -- Execution history
TMP_*               -- GTT tables (session-scoped, ON COMMIT DELETE ROWS)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, inline styles |
| Backend | Spring Boot 3, Spring Security (JWT) |
| Database | Oracle 11g+ |
| Auth | JWT (HS256), role-based (`ROLE_ADMIN`, `ROLE_USER`) |
| Export | Apache POI (xlsx), custom docx templating |
| Scheduling | Spring `@Scheduled` + manual cron evaluation |

---

## Configuration

```properties
# application.properties

# Report file directories
report.export.dir=D:/reports/exports/
report.template.dir=D:/reports/templates/
report.scheduled-reports.dir=D:/reports/scheduled/
report.allowed.download.dir=D:/reports/exports/
```

---

## Security

- All endpoints require JWT authentication
- File download endpoints validate path against `allowed.download.dir` to prevent path traversal
- Users can only download their own scheduled report files (admins can download any)
- Soft delete (`IS_DELETED = 1`) is used for schedules — data is never permanently removed for non-admin users

---

## Key Design Decisions

**Why GTT instead of REF CURSOR?**
REF CURSORs require known column types at compile time. JSON via GTT allows fully dynamic column sets per report — a new report with different columns requires no Java code changes, only a new stored procedure and template file.

**Why raw JDBC for GTT services?**
Spring's `JdbcTemplate` and JPA do not guarantee connection reuse across method calls. GTT data is session-scoped, so all three steps (insert, execute, read) must share one `Connection`. Using `DataSource.getConnection()` directly is the only safe approach.

**Why ROWNUM pagination?**
Oracle 11g does not support `OFFSET/FETCH`. Spring Data's `Pageable` generates ANSI SQL that Oracle 11g cannot parse. All pagination is implemented manually with the `ROWNUM` double-wrap pattern.
