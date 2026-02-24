import { Platform, Dimensions } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { UAParser } from "ua-parser-js";
import { DeviceInfo } from "./database/types";

/**
 * Get device information for React Native
 * Uses Expo and React Native APIs to gather device information
 */
function getReactNativeDeviceInfo(): DeviceInfo {
  const now = new Date().toISOString();
  const dimensions = Dimensions.get("window");

  // Determine device type based on screen size
  let deviceType: DeviceInfo["deviceType"] = "mobile";
  const screenWidth = dimensions.width;
  const screenHeight = dimensions.height;
  const minDimension = Math.min(screenWidth, screenHeight);

  if (minDimension >= 768) {
    deviceType = "tablet";
  } else {
    deviceType = "mobile";
  }

  // Get platform
  const platform =
    Platform.OS === "ios"
      ? "iOS"
      : Platform.OS === "android"
        ? "Android"
        : "unknown";

  // Build user agent string from available info
  const deviceName = Constants.deviceName || "Unknown Device";
  const systemVersion = Platform.Version?.toString() || "unknown";
  const userAgentString =
    `${deviceName} ${Platform.OS} ${systemVersion}`.trim();

  // Get locale info
  const locales = (Constants.locales || []) as Array<{
    languageCode?: string;
    regionCode?: string;
  }>;
  const primaryLocale = locales[0];
  const language = primaryLocale?.languageCode || "unknown";

  // Try to get timezone
  let timezone = "unknown";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    timezone = "unknown";
  }

  return {
    deviceType,
    platform,
    browser: "Native App",
    browserVersion: Application.nativeApplicationVersion || "unknown",
    userAgent: userAgentString,
    screenWidth: Math.round(screenWidth),
    screenHeight: Math.round(screenHeight),
    screenResolution: `${Math.round(screenWidth)}x${Math.round(screenHeight)}`,
    os: Platform.OS === "ios" ? "iOS" : "Android",
    osVersion: systemVersion,
    language,
    timezone,
    collectedAt: now,
    environment: "client",
    connectionType: "unknown",
    deviceMemory: undefined,
    hardwareConcurrency: undefined,
  } as DeviceInfo;
}

/**
 * Get device information for web/browser
 * Uses browser APIs to gather device information
 */
function getWebDeviceInfo(): DeviceInfo {
  const now = new Date().toISOString();
  const userAgent = navigator.userAgent;
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Map device type
  let deviceType: DeviceInfo["deviceType"] = result.device.type || "desktop";

  // Map platform
  let platform: DeviceInfo["platform"] = "unknown";
  if (result.os.name) {
    const os = result.os.name.toLowerCase();
    if (os.includes("ios")) platform = "iOS";
    else if (os.includes("android")) platform = "Android";
    else if (os.includes("windows")) platform = "Windows";
    else if (os.includes("mac")) platform = "macOS";
    else if (os.includes("linux")) platform = "Linux";
  }

  // Screen info
  let screenWidth, screenHeight, screenResolution;
  if (typeof screen !== "undefined") {
    screenWidth = screen.width;
    screenHeight = screen.height;
    screenResolution = `${screen.width}x${screen.height}`;
  }

  // Device capabilities
  let deviceMemory, hardwareConcurrency;
  if ("deviceMemory" in navigator) {
    deviceMemory = (navigator as any).deviceMemory;
  }
  if ("hardwareConcurrency" in navigator) {
    hardwareConcurrency = navigator.hardwareConcurrency;
  }

  // Connection info
  let connectionType: DeviceInfo["connectionType"] = "unknown";
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;
    if (connection && connection.effectiveType) {
      if (connection.effectiveType.includes("wifi")) connectionType = "wifi";
      else if (
        ["2g", "3g", "4g", "5g", "cellular"].some((t) =>
          connection.effectiveType.includes(t),
        )
      )
        connectionType = "cellular";
      else if (connection.effectiveType.includes("ethernet"))
        connectionType = "ethernet";
    }
  }

  return {
    deviceType,
    platform,
    browser: result.browser.name || "unknown",
    browserVersion: result.browser.version || "unknown",
    userAgent,
    screenWidth,
    screenHeight,
    screenResolution,
    deviceMemory,
    hardwareConcurrency,
    connectionType,
    os: result.os.name || "unknown",
    osVersion: result.os.version || "unknown",
    language: navigator.language || "unknown",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    collectedAt: now,
    environment: "client",
  } as DeviceInfo;
}

/**
 * Get device information that works in React Native, Web, and server environments
 */
export function getDeviceInfo(userAgent?: string): DeviceInfo {
  // Web environment
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof navigator !== "undefined"
  ) {
    return getWebDeviceInfo();
  }

  // React Native (iOS/Android)
  if (Platform.OS === "ios" || Platform.OS === "android") {
    return getReactNativeDeviceInfo();
  }

  // Server-side fallback
  const ua = userAgent || "";
  const parser = new UAParser(ua);
  const result = parser.getResult();

  let deviceType: DeviceInfo["deviceType"] = result.device.type || "unknown";
  let platform: DeviceInfo["platform"] = "unknown";
  if (result.os.name) {
    const os = result.os.name.toLowerCase();
    if (os.includes("ios")) platform = "iOS";
    else if (os.includes("android")) platform = "Android";
    else if (os.includes("windows")) platform = "Windows";
    else if (os.includes("mac")) platform = "macOS";
    else if (os.includes("linux")) platform = "Linux";
  }

  return {
    deviceType,
    platform,
    browser: result.browser.name || "unknown",
    browserVersion: result.browser.version || "unknown",
    userAgent: ua,
    os: result.os.name || "unknown",
    osVersion: result.os.version || "unknown",
    language: "unknown",
    timezone: "unknown",
    collectedAt: new Date().toISOString(),
    environment: "server",
    connectionType: "unknown",
  } as DeviceInfo;
}

/**
 * Create a minimal device info object for audit logs
 * Filters out potentially sensitive information
 */
export function getAuditDeviceInfo(userAgent?: string): Partial<DeviceInfo> {
  const fullInfo = getDeviceInfo(userAgent);
  return {
    deviceType: fullInfo.deviceType,
    platform: fullInfo.platform,
    browser: fullInfo.browser,
    browserVersion: fullInfo.browserVersion,
    os: fullInfo.os,
    osVersion: fullInfo.osVersion,
    screenResolution: fullInfo.screenResolution,
    language: fullInfo.language,
    timezone: fullInfo.timezone,
    connectionType: fullInfo.connectionType,
    collectedAt: fullInfo.collectedAt,
    environment: fullInfo.environment,
  };
}
