package com.sallaemallae.backend.domain.auth.repository;

import com.sallaemallae.backend.domain.auth.entity.SocialAccount;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {

  Optional<SocialAccount> findFirstByUserId(Long userId);
}
