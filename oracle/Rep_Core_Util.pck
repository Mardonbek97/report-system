create or replace package Rep_Core_Util is

  -- Author  : MARDONBEK SOBIROV 
  -- Created : 13.01.2026 14:40:54
  -- Purpose : Generating report and convert to json

  --Preparing temporary table to insert 
  Procedure Rep_Prepare;
  Procedure Rep_Buffer_Flush;
  Procedure Rep_Line_Insert(io_Line_ID in out Number, i_Line_Text in CLOB);
  Procedure Info_Session(p_name varchar2);
  Procedure Execute_Proc(p_rep_id varchar2,
                         p_user   varchar2,
                         p_params clob,
                         o_Errmsg out varchar2);
  Procedure Exec_Proc_schedule(p_rep_id     raw,
                               p_params     varchar2,
                               p_user       varchar2,
                               p_start_time date,
                               o_Errmsg     out varchar2);
  Procedure Report_Log_Beg(p_repid raw, p_user number, o_rep_id out number);
  Procedure Report_Log_End(p_repid raw, i_rep_id number);
  Procedure Report_Log_Error(p_repid  raw,
                             i_rep_id number,
                             i_Errmsg varchar2 default null);

end Rep_Core_Util;
/
CREATE OR REPLACE Package Body Rep_Core_Util is

  g_Rep_Lines    Array_Varchar2 := Array_Varchar2();
  g_Rep_Line_IDs Array_Number := Array_Number();

  g_Rep_Line_Cnt   Number;
  g_Rep_Total_Size Number;
  g_Rep_Buf_Size   Number;

  g_Rep_Report_ID Number := SEQ_FOR_TMP_VALUES.NEXTVAL;
  ------------========================================================================================================---
  /**************************************Beginnig Report_Log_Beg********************************************************/
  Procedure Report_Log_Beg(p_repid raw, p_user number, o_rep_id out number) is
  Begin
  
    o_rep_id := error_log_seq.nextval;
    Insert Into rep_core_log
      (id, rep_id, user_id, status, percentage, BG_TIME)
    Values
      (o_rep_id, p_repid, p_user, '1', '10', sysdate);
    --1 Start
    --2 Finished succesfully
    --5 Error Generating
  
    Commit;
  
  End Report_Log_Beg;
  /**************************************Ending Delete_Access********************************************************/
  ------------========================================================================================================---
  /**************************************Beginnig Report_Log_End********************************************************/
  Procedure Report_Log_End(p_repid raw, i_rep_id number) is
  
  Begin
    update rep_core_log t
       set t.status = '2', 
           t.percentage = '100', 
           t.end_time = sysdate
     where t.id = i_rep_id
       and t.rep_id = p_repid;
  
    Commit;
  
  End Report_Log_End;
  /**************************************Ending Report_Log_End********************************************************/
  ------------========================================================================================================---
  /**************************************Beginnig Report_Log_Error********************************************************/
  Procedure Report_Log_Error(p_repid  raw,
                             i_rep_id number,
                             i_Errmsg varchar2 default null) is
  
  Begin
    update rep_core_log t
       set t.status     = '5',
           t.percentage = '10',
           t.end_time   = sysdate,
           t.error_msg  = i_Errmsg
     where t.id = i_rep_id
       and t.rep_id = p_repid;
  
    Commit;
  
  End Report_Log_Error;
  /**************************************Ending Report_Log_Error********************************************************/
  ------------========================================================================================================---
  /**************************************Beginnig Info_Session********************************************************/
  Procedure Info_Session(p_name varchar2) is
  
  Begin
    Dbms_Application_Info.set_action(substr(p_name, 1, 30));
  End Info_Session;
  /**************************************Ending Delete_Access********************************************************/
  ------------========================================================================================================---   
  /*********************************************Beginnig Rep_Buffer_Flush*********************************************/
  Procedure Rep_Buffer_Flush is
  begin
    if g_Rep_Lines is not NULL and g_Rep_Lines.Count > 0 then
      forall I in 1 .. g_Rep_Lines.Count
        insert into Rep_Core_Tmp
          (Rep_Id, Row_Number, Data)
        values
          (g_Rep_Report_ID, g_Rep_Line_IDs(I), g_Rep_Lines(I));
      commit;
    end if;
    g_Rep_Buf_Size := 0;
    g_Rep_Lines    := Array_Varchar2();
    g_Rep_Line_IDs := Array_Number();
  end Rep_Buffer_Flush;
  /***************************************************Ending Rep_Buffer_Flush****************************************/
  ------------========================================================================================================-----   
  /**************************************Beginnig Rep_Prepare********************************************************/
  Procedure Rep_Prepare is
    v_SQL varchar2(200);
  begin
    Rep_Buffer_Flush;
  
    g_Rep_Line_Cnt   := 0;
    g_Rep_Total_Size := 0;
    v_SQL            := 'Truncate Table Rep_Core_Tmp';
    EXECUTE IMMEDIATE v_SQL;
  
  end Rep_Prepare;
  /***********************************************Ending Rep_Prepare************************************************************/
  ------------========================================================================================================----- 
  /*********************************************Beginnig Rep_Line_Insert*********************************************************/
  Procedure Rep_Line_Insert(io_Line_ID in out Number, i_Line_Text in CLOB) is
    v_Line_Size Number := dbms_lob.getlength(i_Line_Text);
  begin
    if g_Rep_Buf_Size > 4194304 or g_Rep_Lines.Count > 20000 then
      Rep_Buffer_Flush;
    end if;
    io_Line_ID := NVL(io_Line_ID, 1);
    g_Rep_Lines.Extend;
    g_Rep_Lines(g_Rep_Lines.Count) := i_Line_Text;
    g_Rep_Line_IDs.Extend;
    g_Rep_Line_IDs(g_Rep_Line_IDs.Count) := io_Line_ID;
    io_Line_ID := io_Line_ID + 1;
    g_Rep_Line_Cnt := g_Rep_Line_Cnt + 1;
    g_Rep_Buf_Size := g_Rep_Buf_Size + v_Line_Size;
    g_Rep_Total_Size := g_Rep_Total_Size + v_Line_Size + 2;
  end Rep_Line_Insert;
  /*********************************************Ending Rep_Line_Insert**************************************************/
  ------------========================================================================================================----- 
  /*********************************************Beginnig  Access_Right*******************************************/
  Function Access_Right(p_rep_id raw, p_user varchar2) return boolean is
    v_Res number := 0;
  Begin
    Select count(1)
      into v_Res
      from rep_core_access t
     where t.rep_id = p_rep_id
       and t.user_id = p_user;
    if v_Res > 0 then
      return true;
    else
      return false;
    end if;
  
  End Access_Right;
  /*********************************************Ending Access_Right**************************************************/
  ------------========================================================================================================----- 
  /*********************************************Beginnig  Execute_Proc*******************************************/
  Procedure Execute_Proc(p_rep_id varchar2,
                         p_user   varchar2,
                         p_params clob,
                         o_Errmsg out varchar2) is
    v_rep_name        varchar2(50);
    v_package_name    varchar2(200);
    v_sql             VARCHAR2(32767);
    v_json            pljson := pljson();
    v_keys            pljson_list := pljson_list();
    v_param_list      VARCHAR2(32767) := '';
    v_param_name      VARCHAR2(100);
    v_param_value     VARCHAR2(4000);
    v_rep_id          number;
    user_access_right EXCEPTION;
    i_rep_id          raw(16);
  Begin
  
  i_rep_id := p_rep_id;
  
    Select replace(substr(t.name, 1, 30), ' ', '_'), t.package_name
      into v_rep_name, v_package_name
      from rep_core_name t
     where t.id = i_rep_id
       and t.status = '1'; --1=>Active 2=>Deleted
  
    v_json := pljson(p_params);
  
    v_sql  := 'BEGIN ' || v_package_name || '(';
    v_keys := v_json.get_keys;
  
    FOR i IN 1 .. v_keys.count LOOP
      v_param_name := REPLACE(v_keys.get(i).to_char, '"', '');
    
      IF v_json.get(v_param_name).is_string THEN
        v_param_value := v_json.get_string(v_param_name);
        v_param_list  := v_param_list || '''' || v_param_value || '''';
      ELSIF v_json.get(v_param_name).is_number THEN
        v_param_value := v_json.get_number(v_param_name);
        v_param_list  := v_param_list || v_param_value;
      ELSIF v_json.get(v_param_name).is_date THEN
        v_param_value := v_json.get_string(v_param_name);
        v_param_list  := v_param_list || 'TO_DATE(''' || v_param_value ||
                         ''', ''YYYY-MM-DD'')';
      ELSE
        v_param_list := v_param_list || 'NULL';
      END IF;
    
      IF i < v_keys.COUNT THEN
        v_param_list := v_param_list || ', ';
      END IF;
    END LOOP;
  
    v_sql := v_sql || v_param_list || '); END;';
  
    Info_Session(p_name => v_rep_name);
    rep_core_util.Report_Log_Beg(p_repid  => i_rep_id,
                                 p_user   => p_user,
                                 o_rep_id => v_rep_id);
    Rep_Prepare;
    if not Access_Right(i_rep_id, p_user) then
      raise user_access_right;
    end if;
    Execute immediate v_sql;
    rep_core_util.Report_Log_End(p_repid => i_rep_id, i_rep_id => v_rep_id);
  
  Exception
    when user_access_right then
      o_Errmsg := 'You do not have access the report';
      rep_core_util.Report_Log_Error(p_repid  => i_rep_id,
                                     i_rep_id => v_rep_id,
                                     i_Errmsg => o_Errmsg);
    when others then
      o_Errmsg := dbms_utility.format_error_backtrace;
      rep_core_util.Report_Log_Error(p_repid  => i_rep_id,
                                     i_rep_id => v_rep_id,
                                     i_Errmsg => o_Errmsg||' '||v_sql);
    
  End Execute_Proc;
  /***************************************************Ending Execute_Proc**************************************/
  ------------========================================================================================================----- 
  /*********************************************Beginnig  Exec_Proc_schedule*************************************************/
  Procedure Exec_Proc_schedule(p_rep_id     raw,
                               p_params     varchar2,
                               p_user       varchar2,
                               p_start_time date,
                               o_Errmsg     out varchar2) is
    v_rep_name        varchar2(50);
    v_package_name    varchar2(200);
    v_sql             VARCHAR2(32767);
    v_json            pljson := pljson();
    v_keys            pljson_list := pljson_list();
    v_param_list      VARCHAR2(32767) := '';
    v_param_name      VARCHAR2(100);
    v_param_value     VARCHAR2(4000);
    v_sql_log         VARCHAR2(4000);
    v_rep_id          number;
    user_access_right EXCEPTION;
  Begin
  
    Select replace(substr(t.name, 1, 30), ' ', '_'), t.package_name
      into v_rep_name, v_package_name
      from rep_core_name t
     where t.id = p_rep_id;
  
    v_json := pljson(p_params);
  
    v_sql  := 'BEGIN ' || v_package_name || '(';
    v_keys := v_json.get_keys;
  
    FOR i IN 1 .. v_keys.count LOOP
      v_param_name := REPLACE(v_keys.get(i).to_char, '"', '');
    
      IF v_json.get(v_param_name).is_string THEN
        v_param_value := v_json.get_string(v_param_name);
        v_param_list  := v_param_list || '''' || v_param_value || '''';
      ELSIF v_json.get(v_param_name).is_number THEN
        v_param_value := v_json.get_number(v_param_name);
        v_param_list  := v_param_list || v_param_value;
      ELSIF v_json.get(v_param_name).is_date THEN
        v_param_value := v_json.get_string(v_param_name);
        v_param_list  := v_param_list || 'TO_DATE(''' || v_param_value ||
                         ''', ''YYYY-MM-DD'')';
      ELSE
        v_param_list := v_param_list || 'NULL';
      END IF;
    
      IF i < v_keys.COUNT THEN
        v_param_list := v_param_list || ', ';
      END IF;
    END LOOP;
  
    Rep_Prepare;
    if not Access_Right(p_rep_id, p_user) then
      raise user_access_right;
    end if;
  
    v_rep_id := error_log_seq.nextval;
    v_sql := v_sql || v_param_list || '); 
    Exception when others then
      o_Errmsg := dbms_utility.format_error_backtrace;
       Rep_core_util.Report_Log_Error(p_repid  =>' || p_rep_id || ',
                                     i_rep_id =>' || v_rep_id || ',
                                     i_Errmsg => o_Errmsg);
    END;';
  
    v_sql_log := '
    Info_Session(p_name => ' || v_rep_name || ');
    rep_core_util.Report_Log_Beg(p_repid =>' || p_rep_id ||
                 ', p_user => ' || p_user || ',  o_rep_id =>' || v_rep_id || ');
    Rep_Prepare;
    Execute immediate' || v_sql || ';
    rep_core_util.Report_Log_End(p_repid =>' || p_rep_id ||
                 ',  i_rep_id => ' || v_rep_id || ');';
                 
     update rep_core_log t
       set t.status = '3',  --3=>Scheduled
           t.percentage = '0'
     where t.id = v_rep_id
       and t.rep_id = p_rep_id;
  
    Commit;
  
    dbms_scheduler.create_job(job_name   => v_rep_name,
                              job_type   => 'PLSQL_BLOCK',
                              job_action => v_sql_log,
                              start_date => p_start_time,
                              enabled    => TRUE);
  
  Exception
    when user_access_right then
      o_Errmsg := 'You do not have access the report';
      rep_core_util.Report_Log_Error(p_repid  => p_rep_id,
                                     i_rep_id => v_rep_id,
                                     i_Errmsg => o_Errmsg);
    when others then
      o_Errmsg := dbms_utility.format_error_backtrace;
    
  End Exec_Proc_schedule;
  /***************************************************Ending Exec_Proc_schedule**************************************/
  ------------========================================================================================================----- 
  /*********************************************Beginnig  Get_Params*************************************************/
  Function Get_Params(p_rep_id raw) return pljson is
    v_Json pljson := pljson();
  
  Begin
    for rec in (Select t.param_order, t.param_name
                  from rep_core_params t
                 where t.rep_id = p_rep_id) Loop
    
      v_Json.put('ord', rec.param_order);
      v_Json.put('param', rec.param_name);
    
    End Loop;
  
    return v_Json;
  Exception
    when others then
      v_Json.put('ord', '1');
      v_Json.put('param', sqlerrm);
      return v_Json;
    
  End Get_Params;
  /***************************************************Ending Get_Params**************************************/
------------========================================================================================================----- 
/*********************************************Beginnig  Get_Params*************************************************/

End Rep_Core_Util;
/
