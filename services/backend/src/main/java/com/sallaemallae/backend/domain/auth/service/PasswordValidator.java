package com.sallaemallae.backend.domain.auth.service;

import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class PasswordValidator {

  private static final int MIN_LENGTH = 8;
  private static final int MAX_LENGTH = 20;

  // 영문 대문자 1개 이상
  private static final Pattern UPPERCASE_PATTERN = Pattern.compile(".*[A-Z].*");
  // 영문 소문자 1개 이상
  private static final Pattern LOWERCASE_PATTERN = Pattern.compile(".*[a-z].*");
  // 숫자 1개 이상
  private static final Pattern DIGIT_PATTERN = Pattern.compile(".*\\d.*");
  // 특수문자 1개 이상
  private static final Pattern SPECIAL_CHAR_PATTERN = Pattern.compile(".*[!@#$%^&*(),.?\":{}|<>].*");
  // 연속 동일 문자 3자 이상
  private static final Pattern CONSECUTIVE_SAME_CHARS = Pattern.compile("(.)\\1{2,}");

  public ValidationResult validate(String password, String email) {
    if (password == null || password.isEmpty()) {
      return ValidationResult.fail("비밀번호를 입력해주세요.");
    }

    // 길이 검사
    if (password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
      return ValidationResult.fail("비밀번호는 " + MIN_LENGTH + "~" + MAX_LENGTH + "자여야 합니다.");
    }

    // 영문 대문자 검사
    if (!UPPERCASE_PATTERN.matcher(password).matches()) {
      return ValidationResult.fail("비밀번호에 영문 대문자가 1개 이상 포함되어야 합니다.");
    }

    // 영문 소문자 검사
    if (!LOWERCASE_PATTERN.matcher(password).matches()) {
      return ValidationResult.fail("비밀번호에 영문 소문자가 1개 이상 포함되어야 합니다.");
    }

    // 숫자 검사
    if (!DIGIT_PATTERN.matcher(password).matches()) {
      return ValidationResult.fail("비밀번호에 숫자가 1개 이상 포함되어야 합니다.");
    }

    // 특수문자 검사
    if (!SPECIAL_CHAR_PATTERN.matcher(password).matches()) {
      return ValidationResult.fail("비밀번호에 특수문자가 1개 이상 포함되어야 합니다.");
    }

    // 이메일 포함 여부 검사
    if (email != null && !email.isEmpty()) {
      String emailLocalPart = email.split("@")[0].toLowerCase();
      if (password.toLowerCase().contains(emailLocalPart)) {
        return ValidationResult.fail("비밀번호에 이메일 주소를 포함할 수 없습니다.");
      }
    }

    // 연속 동일 문자 검사
    if (CONSECUTIVE_SAME_CHARS.matcher(password).find()) {
      return ValidationResult.fail("비밀번호에 동일한 문자가 3자 이상 연속될 수 없습니다.");
    }

    return ValidationResult.success();
  }

  public record ValidationResult(boolean valid, String message) {

    public static ValidationResult success() {
      return new ValidationResult(true, null);
    }

    public static ValidationResult fail(String message) {
      return new ValidationResult(false, message);
    }
  }
}
