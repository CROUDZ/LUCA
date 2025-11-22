#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p android/app/src/main/assets
cp -r src/webInterface/. android/app/src/main/assets/

DEVTOOLS_PORT=8097
DEVTOOLS_LOG="${TMPDIR:-/tmp}/rn-devtools.log"

if command -v lsof >/dev/null 2>&1 && lsof -i TCP:${DEVTOOLS_PORT} -s TCP:LISTEN >/dev/null 2>&1; then
  echo "[dev] React Native DevTools already running on port ${DEVTOOLS_PORT}"
else
  echo "[dev] Starting React Native DevTools on port ${DEVTOOLS_PORT} (logs: ${DEVTOOLS_LOG})"
  npx react-native devtools --port ${DEVTOOLS_PORT} >"${DEVTOOLS_LOG}" 2>&1 &
  DEVTOOLS_PID=$!
  trap 'if [ -n "${DEVTOOLS_PID:-}" ]; then kill ${DEVTOOLS_PID} 2>/dev/null || true; fi' EXIT
  # Give DevTools a moment to start before continuing
  sleep 1
fi

if command -v adb >/dev/null 2>&1; then
  echo "[dev] Setting up adb reverse tunnels for Metro (8081) and DevTools (8097)"
  adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true
  adb reverse tcp:8097 tcp:8097 >/dev/null 2>&1 || true
else
  echo "[dev] adb not found; skipping reverse port configuration"
fi

react-native run-android
