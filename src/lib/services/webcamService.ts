export interface WebcamService {
  start(): Promise<MediaStream>
  stop(): void
  getStream(): MediaStream | null
}

class BrowserWebcamService implements WebcamService {
  private stream: MediaStream | null = null

  async start(): Promise<MediaStream> {
    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    return this.stream
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  getStream(): MediaStream | null {
    return this.stream
  }
}

export const webcamService: WebcamService = new BrowserWebcamService()
