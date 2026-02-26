-- Create table
create global temporary table REP_CORE_TMP
(
  rep_id     NUMBER,
  row_number NUMBER,
  data       CLOB
)
on commit preserve rows;

-- Create table
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
  apl_dt     DATE default sysdate
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_LOG
  add constraint FK_LOG_REP foreign key (REP_ID)
  references REP_CORE_NAME (ID);

-- Create table
create table REP_CORE_USERS
(
  id          NUMBER,
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

-- Create table
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

-- Create table
create table REP_CORE_NAME
(
  id           RAW(16) default SYS_GUID() not null,
  name         VARCHAR2(100),
  package_name VARCHAR2(100),
  status       CHAR(1),
  created_at   DATE default SYSDATE,
  modified_at  DATE default SYSDATE
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_NAME
  add primary key (ID);
  
  -- Create table
create table REP_CORE_PARAMS
(
  rep_id      RAW(16),
  param_name  VARCHAR2(100),
  param_type  VARCHAR2(100),
  param_order NUMBER
);
-- Create/Recreate primary, unique and foreign key constraints 
alter table REP_CORE_PARAMS
  add constraint FK_REP_PARAMS foreign key (REP_ID)
  references REP_CORE_NAME (ID);


