package com.example.report_system.repository;

import com.example.report_system.entity.RepAccess;
import com.example.report_system.entity.RepAccessId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RepAccessRepository extends JpaRepository<RepAccess, RepAccessId> {

    @Query(
            value = "SELECT COUNT(1) FROM REP_CORE_ACCESS WHERE REP_ID = :repId AND USER_ID = :userId",
            nativeQuery = true
    )
    Long countByUserIdAndRepId(@Param("userId") Long userId, @Param("repId") UUID repId);

    // Report ga biriktirilgan barcha user ID lari
    @Query(
            value = "SELECT USER_ID FROM REP_CORE_ACCESS WHERE REP_ID = :repId",
            nativeQuery = true
    )
    List<Long> findUserIdsByRepId(@Param("repId") UUID repId);
}