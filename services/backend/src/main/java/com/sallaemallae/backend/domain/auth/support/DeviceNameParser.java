package com.sallaemallae.backend.domain.auth.support;

/**
 * User-Agent 문자열에서 사람이 읽기 쉬운 기기 이름을 추출합니다.
 * 예: "Chrome 125 / Windows 10", "Safari / macOS", "Mobile Safari / iPhone"
 */
public final class DeviceNameParser {

  private DeviceNameParser() {
  }

  public static String parse(String userAgent) {
    if (userAgent == null || userAgent.isBlank() || "Unknown".equals(userAgent)) {
      return "알 수 없는 기기";
    }

    String browser = extractBrowser(userAgent);
    String os = extractOs(userAgent);

    if (browser.isEmpty() && os.isEmpty()) {
      return "알 수 없는 기기";
    }
    if (browser.isEmpty()) {
      return os;
    }
    if (os.isEmpty()) {
      return browser;
    }
    return browser + " / " + os;
  }

  private static String extractBrowser(String ua) {
    if (ua.contains("Edg/")) {
      return "Edge " + extractVersion(ua, "Edg/");
    }
    if (ua.contains("OPR/") || ua.contains("Opera")) {
      return "Opera";
    }
    if (ua.contains("Chrome/") && !ua.contains("Edg/")) {
      return "Chrome " + extractVersion(ua, "Chrome/");
    }
    if (ua.contains("Safari/") && !ua.contains("Chrome/")) {
      return ua.contains("Mobile") ? "Mobile Safari" : "Safari";
    }
    if (ua.contains("Firefox/")) {
      return "Firefox " + extractVersion(ua, "Firefox/");
    }
    return "";
  }

  private static String extractOs(String ua) {
    if (ua.contains("iPhone")) {
      return "iPhone";
    }
    if (ua.contains("iPad")) {
      return "iPad";
    }
    if (ua.contains("Android")) {
      return "Android";
    }
    if (ua.contains("Windows NT 10")) {
      return "Windows 10";
    }
    if (ua.contains("Windows NT")) {
      return "Windows";
    }
    if (ua.contains("Mac OS X")) {
      return "macOS";
    }
    if (ua.contains("Linux")) {
      return "Linux";
    }
    return "";
  }

  private static String extractVersion(String ua, String token) {
    int start = ua.indexOf(token);
    if (start < 0) {
      return "";
    }
    start += token.length();
    int end = start;
    while (end < ua.length() && ua.charAt(end) != ' ' && ua.charAt(end) != ';') {
      end++;
    }
    String version = ua.substring(start, end);
    int dot = version.indexOf('.');
    return dot > 0 ? version.substring(0, dot) : version;
  }
}
