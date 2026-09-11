import assert from "node:assert/strict";
import test from "node:test";
import {
  isAllowedVoiceFile,
  isValidTimeZone,
  MAX_VOICE_FILE_BYTES,
  parseVoiceMode,
} from "../../lib/voiceCaptureValidation";

test("voice mode rejects unknown values", () => {
  assert.equal(parseVoiceMode("review"), "review");
  assert.equal(parseVoiceMode("unlimited"), null);
});

test("voice files enforce type and size boundaries", () => {
  assert.equal(isAllowedVoiceFile(new File([new Uint8Array(2_000)], "voice.webm", { type: "audio/webm" })), true);
  assert.equal(isAllowedVoiceFile(new File([new Uint8Array(10)], "voice.webm", { type: "audio/webm" })), false);
  assert.equal(isAllowedVoiceFile(new File([new Uint8Array(2_000)], "voice.txt", { type: "text/plain" })), false);
  assert.equal(
    isAllowedVoiceFile(new File([new Uint8Array(MAX_VOICE_FILE_BYTES + 1)], "voice.webm", { type: "audio/webm" })),
    false
  );
});

test("voice timezone must be recognized and bounded", () => {
  assert.equal(isValidTimeZone("Europe/Athens"), true);
  assert.equal(isValidTimeZone("not/a-zone"), false);
  assert.equal(isValidTimeZone("x".repeat(65)), false);
});