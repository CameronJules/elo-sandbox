export interface MicrophoneService {
  start(): Promise<MediaStream>
  stop(): void
  getStream(): MediaStream | null
  getTrack(): MediaStreamTrack | null
}

class BrowserMicrophoneService implements MicrophoneService {
  private stream: MediaStream | null = null

  async start(): Promise<MediaStream> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    return this.stream
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  getTrack(): MediaStreamTrack | null {
    return this.stream?.getAudioTracks()[0] ?? null
  }
}

export const microphoneService: MicrophoneService = new BrowserMicrophoneService()
