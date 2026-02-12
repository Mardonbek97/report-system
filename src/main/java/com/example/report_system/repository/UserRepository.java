package com.example.report_system.repository;

import com.example.report_system.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {

    @Query(value = "SELECT * FROM REP_CORE_USERS WHERE USERNAME = :username", nativeQuery = true)
    Optional<Users> findByUsername(@Param("username") String username);

    @Query(value = "SELECT * FROM REP_CORE_USERS WHERE EMAIL = :email", nativeQuery = true)
    Optional<Users> findByEmail(@Param("email") String email);

    @Query(value = "SELECT COUNT(*) FROM REP_CORE_USERS WHERE USERNAME = :username", nativeQuery = true)
    Long countByUsername(@Param("username") String username);

    @Query(value = "SELECT COUNT(*) FROM REP_CORE_USERS WHERE EMAIL = :email", nativeQuery = true)
    Long countByEmail(@Param("email") String email);

    @Query(value = "SELECT COUNT(*) FROM REP_CORE_USERS WHERE ROLE = :role", nativeQuery = true)
    Long countByRole(@Param("role") String username);
}
