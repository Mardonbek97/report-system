package com.example.report_system.repository;

import com.example.report_system.dto.ReportParamsDto;
import com.example.report_system.entity.Reports;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Reports, Long> {

    @Query(value = "SELECT * FROM REP_CORE_NAME WHERE lower(NAME) like lower(:reportName) ||'%'", nativeQuery = true)
    Optional<Reports> findByReportName(@Param("reportName") String reportName);

    @Query(value = "SELECT * FROM REP_CORE_NAME WHERE id = :uuid", nativeQuery = true)
    Optional<Reports> findById(@Param("uuid") UUID uuid);

    @Query(value = "SELECT P.PARAM_NAME, P.PARAM_TYPE, P.PARAM_VIEW \n" +
                    " FROM REP_CORE_NAME T\n" +
                    "LEFT JOIN REP_CORE_PARAMS P \n" +
                    "ON T.ID = P.REP_ID\n" +
                    "WHERE ID = :uuid\n" +
                    "\n" +
                    "ORDER BY P.PARAM_ORDER", nativeQuery = true)
    List<ReportParamsDto> findByIdParams(@Param("uuid") UUID uuid);
}
