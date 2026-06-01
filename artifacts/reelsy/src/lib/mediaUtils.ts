// Audio & Video media utilities for Reelsy

export interface MediaUploadResult {
  success: boolean;
  mediaUrl?: string;
  mediaType: "audio" | "video" | "image";
  error?: string;
}

/**
 * Upload audio blob to server
 */
export async function uploadAudio(audioBlob: Blob, userId: string): Promise<MediaUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob, `audio-${Date.now()}.webm`);
    formData.append("userId", userId);
    formData.append("mediaType", "audio");

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Audio upload failed");
    }

    const result = await response.json();
    return {
      success: true,
      mediaUrl: result.mediaUrl,
      mediaType: "audio",
    };
  } catch (error) {
    console.error("Audio upload error:", error);
    return {
      success: false,
      mediaType: "audio",
      error: error instanceof Error ? error.message : "Audio upload failed",
    };
  }
}

/**
 * Upload video blob to server
 */
export async function uploadVideo(videoBlob: Blob, userId: string): Promise<MediaUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", videoBlob, `video-${Date.now()}.webm`);
    formData.append("userId", userId);
    formData.append("mediaType", "video");

    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Video upload failed");
    }

    const result = await response.json();
    return {
      success: true,
      mediaUrl: result.mediaUrl,
      mediaType: "video",
    };
  } catch (error) {
    console.error("Video upload error:", error);
    return {
      success: false,
      mediaType: "video",
      error: error instanceof Error ? error.message : "Video upload failed",
    };
  }
}

/**
 * Record audio from microphone
 */
export async function recordAudio(durationMs: number = 5000): Promise<{ blob: Blob | null; error: string | null }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        resolve({ blob, error: null });
      };

      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();
      }, durationMs);
    });
  } catch (error) {
    console.error("Audio recording error:", error);
    return {
      blob: null,
      error: error instanceof Error ? error.message : "Failed to record audio",
    };
  }
}

/**
 * Record video from camera
 */
export async function recordVideo(durationMs: number = 15000): Promise<{ blob: Blob | null; error: string | null }> {
  try {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    }

    const mediaRecorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        stream.getTracks().forEach((track) => track.stop());
        resolve({ blob, error: null });
      };

      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();
      }, Math.min(durationMs, 15000)); // Max 15 seconds
    });
  } catch (error) {
    console.error("Video recording error:", error);
    return {
      blob: null,
      error: error instanceof Error ? error.message : "Failed to record video",
    };
  }
}

/**
 * Get current recording time with pretty format
 */
export function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Convert Blob to data URL for preview
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
