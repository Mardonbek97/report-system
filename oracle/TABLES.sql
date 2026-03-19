-- Create sequence 
CREATE SEQUENCE SEQ_FOR_VAL
MINVALUE 1
MAXVALUE 9999999999999999999999999999
START WITH 1481
INCREMENT BY 1
CACHE 20;

-- REP_CORE_TMP
create global temporary table REP_CORE_TMP
(
  rep_id     NUMBER,
  row_number NUMBER,
  data       CLOB
)
on commit preserve rows;

-- REP_CORE_NAME
create table REP_CORE_NAME
(
  id           RAW(16) default SYS_GUID() not null,
  name         VARCHAR2(100),
  package_name VARCHAR2(100),
  status       CHAR(1),
  created_at   DATE default SYSDATE,
  modified_at  DATE default SYSDATE,
  template     VARCHAR2(100),
  folder_id    RAW(16)
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_NAME
  add primary key (ID);
  
alter table REP_CORE_NAME
  add constraint FK_REP_FOLDER foreign key (FOLDER_ID)
  references REP_CORE_FOLDER (ID);
  
-- REP_CORE_PARAMS
create table REP_CORE_PARAMS
(
  rep_id      RAW(16),
  param_name  VARCHAR2(100),
  param_type  VARCHAR2(100),
  param_order NUMBER,
  param_view  NVARCHAR2(200),
  def_value   VARCHAR2(4000)
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_PARAMS
  add constraint FK_REP_PARAMS foreign key (REP_ID)
  references REP_CORE_NAME (ID);

-- REP_CORE_ACCESS
create table REP_CORE_ACCESS
(
  rep_id        RAW(16),
  user_id       NUMBER,
  salary_access NUMBER(1),
  created_at    DATE default SYSDATE
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_ACCESS
  add constraint FK_REP_ROLE foreign key (REP_ID)
  references REP_CORE_NAME (ID);

-- REP_CORE_USERS
create table REP_CORE_USERS
(
  id          NUMBER not null,
  username    VARCHAR2(100) not null,
  password    VARCHAR2(100) not null,
  created_at  DATE default SYSDATE,
  modified_at DATE default SYSDATE,
  ip_address  VARCHAR2(20),
  last_login  DATE,
  status      VARCHAR2(1),
  email       VARCHAR2(100),
  role        VARCHAR2(100),
  is_enabled  NUMBER
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_USERS
  add constraint PK_CORE_USERS primary key (ID);

-- REP_CORE_LOG
create table REP_CORE_LOG
(
  id         NUMBER,
  rep_id     RAW(16),
  user_id    NUMBER,
  bg_time    DATE,
  end_time   DATE,
  status     VARCHAR2(3),
  percentage VARCHAR2(3),
  error_msg  VARCHAR2(200),
  apl_dt     DATE default sysdate,
  params     VARCHAR2(4000)
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_LOG
  add constraint FK_LOG_REP foreign key (REP_ID)
  references REP_CORE_NAME (ID);


-- REP_CORE_EXCEL_TMP
create table REP_CORE_EXCEL_TMP
(
  id          RAW(20),
  rep_id      RAW(20),
  row_number  NUMBER,
  import_data CLOB,
  rep_log_id  NUMBER
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_EXCEL_TMP
  add constraint FK_CORE_EXCEL_TMP foreign key (REP_ID)
  references REP_CORE_NAME (ID);

-- REP_CORE_SCHEDULE
create table REP_CORE_SCHEDULE
(
  id          RAW(16) default SYS_GUID() not null,
  rep_id      RAW(16) not null,
  user_id     NUMBER not null,
  params      CLOB,
  file_format VARCHAR2(10) default 'xlsx',
  cron_expr   VARCHAR2(100),
  run_at      TIMESTAMP(6),
  is_active   NUMBER(1) default 1,
  last_run    TIMESTAMP(6),
  last_status VARCHAR2(20),
  last_error  VARCHAR2(1000),
  last_file   VARCHAR2(500),
  created_at  TIMESTAMP(6) default SYSTIMESTAMP,
  is_deleted  NUMBER default 0
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_SCHEDULE
  add primary key (ID);
alter table REP_CORE_SCHEDULE
  add constraint FK_SCHED_REP foreign key (REP_ID)
  references REP_CORE_NAME (ID);
alter table REP_CORE_SCHEDULE
  add constraint FK_SCHED_USER foreign key (USER_ID)
  references REP_CORE_USERS (ID);

-- Create table
create table REP_CORE_FOLDER
(
  id   RAW(20) default sys_guid() not null,
  name VARCHAR2(200)
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_FOLDER
  add constraint PK_REP_CORE_FOLDER primary key (ID);

