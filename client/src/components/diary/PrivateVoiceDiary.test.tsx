import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivateVoiceDiary } from "./PrivateVoiceDiary";

const noOp = () => undefined;

describe("PrivateVoiceDiary", () => {
  it("masks controls outside private scope and retains explicit consent for local drafts", () => {
    const commonProps = {
      canEdit: true,
      isRecording: false,
      isPreparing: false,
      isUploading: false,
      isDeleting: false,
      aiConsent: false,
      onConsentChange: noOp,
      onStartRecording: noOp,
      onStopRecording: noOp,
      onDiscardDraft: noOp,
      onUploadDraft: noOp,
      onDeleteVoiceNote: noOp,
    };
    const blocked = renderToStaticMarkup(<PrivateVoiceDiary {...commonProps} shareScope="link" drafts={[]} voiceNotes={[]} />);
    const privateDiary = renderToStaticMarkup(<PrivateVoiceDiary {...commonProps} shareScope="private" drafts={[{ id: "draft-1", eventId: 1, blob: new Blob(["voice"]), mimeType: "audio/webm", fileName: "private-voice.webm", durationMs: 1_500, createdAt: 0 }]} voiceNotes={[{ id: 4, fileName: "recording.webm", durationMs: 2_000, language: "zh", url: "https://media.example.test/recording", transcript: "只在私人工作台顯示。" }]} />);

    expect(blocked).toContain("語音日記不會出現在公開或連結分享");
    expect(blocked).not.toContain("開始錄音");
    expect(privateDiary).toContain("錄音會先保存在這台裝置");
    expect(privateDiary).toContain("THIS DEVICE / NOT UPLOADED");
    expect(privateDiary).toContain("我確認本次上傳的錄音會送往語音轉寫服務");
    expect(privateDiary).toContain("PRIVATE RECORDINGS");
    expect(privateDiary).toContain("只在私人工作台顯示。");
    expect(privateDiary).toContain('disabled=""');
  });
});
