package com.sallaemallae.backend.global.email;

public interface EmailService {

  void sendVerificationCode(String to, String code);

  void sendPasswordResetCode(String to, String code);
}
