type PasswordValidationOptions = {
  requiredMessage?: string;
  mismatchMessage?: string;
};

const LETTER_REGEX = /[a-zA-Z]/;
const DIGIT_REGEX = /\d/;
const SPECIAL_CHARACTER_REGEX = /[!@#$%^&*(),.?":{}|<>]/;
const CONSECUTIVE_REPEAT_REGEX = /(.)\1{2,}/;

export function validatePasswordPolicy(
  password: string,
  email: string | null,
  options?: PasswordValidationOptions,
) {
  const requiredMessage = options?.requiredMessage ?? "비밀번호를 입력해 주세요.";

  if (!password.trim()) {
    return requiredMessage;
  }

  if (password.length < 8 || password.length > 20) {
    return "비밀번호는 8~20자여야 합니다.";
  }

  if (!LETTER_REGEX.test(password)) {
    return "비밀번호는 영문을 1자 이상 포함해야 합니다.";
  }

  if (!DIGIT_REGEX.test(password)) {
    return "비밀번호는 숫자를 1자 이상 포함해야 합니다.";
  }

  if (!SPECIAL_CHARACTER_REGEX.test(password)) {
    return "비밀번호는 특수문자를 1자 이상 포함해야 합니다.";
  }

  const emailLocalPart = email?.split("@")[0]?.trim().toLowerCase() ?? "";
  if (emailLocalPart && password.toLowerCase().includes(emailLocalPart)) {
    return "비밀번호에 이메일 주소를 포함할 수 없습니다.";
  }

  if (CONSECUTIVE_REPEAT_REGEX.test(password)) {
    return "동일한 문자를 3자 이상 연속해서 사용할 수 없습니다.";
  }

  return null;
}

export function validatePasswordConfirmation(
  password: string,
  passwordConfirm: string,
  options?: PasswordValidationOptions,
) {
  const requiredMessage = options?.requiredMessage ?? "비밀번호 확인을 입력해 주세요.";
  const mismatchMessage = options?.mismatchMessage ?? "비밀번호와 확인 비밀번호가 일치하지 않습니다.";

  if (!passwordConfirm.trim()) {
    return requiredMessage;
  }

  if (password !== passwordConfirm) {
    return mismatchMessage;
  }

  return null;
}
