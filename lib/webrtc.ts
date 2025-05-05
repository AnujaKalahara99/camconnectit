// WebRTC connection manager

// Configuration for STUN/TURN servers
const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
}

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private sessionId: string
  private isInitiator: boolean
  private onConnectedCallback: () => void
  private onDisconnectedCallback: () => void
  private onMediaReceivedCallback: (media: { type: string; data: Blob; id: string }) => void
  private pollingInterval: NodeJS.Timeout | null = null
  private lastOfferIndex = 0
  private lastAnswerIndex = 0
  private lastCandidateIndex = 0
  private connectionState: "new" | "connecting" | "connected" | "disconnected" | "failed" = "new"

  constructor(
    sessionId: string,
    isInitiator: boolean,
    onConnected: () => void,
    onDisconnected: () => void,
    onMediaReceived: (media: { type: string; data: Blob; id: string }) => void,
  ) {
    this.sessionId = sessionId
    this.isInitiator = isInitiator
    this.onConnectedCallback = onConnected
    this.onDisconnectedCallback = onDisconnected
    this.onMediaReceivedCallback = onMediaReceived
  }

  async initialize() {
    try {
      this.peerConnection = new RTCPeerConnection(rtcConfig)

      // Set up event handlers
      this.peerConnection.onicecandidate = (event) => this.handleICECandidate(event)
      this.peerConnection.onconnectionstatechange = () => this.handleConnectionStateChange()
      this.peerConnection.ondatachannel = (event) => this.handleDataChannel(event)

      if (this.isInitiator) {
        // Create data channel if we're the initiator (laptop)
        this.dataChannel = this.peerConnection.createDataChannel("mediaTransfer")
        this.setupDataChannel(this.dataChannel)

        // Create and send offer
        const offer = await this.peerConnection.createOffer()
        await this.peerConnection.setLocalDescription(offer)

        // Send offer to signaling server
        await this.sendSignalingMessage("offer", offer)
      }

      // Start polling for signaling messages
      this.startPolling()

      this.connectionState = "connecting"
      return true
    } catch (error) {
      console.error("Failed to initialize WebRTC connection:", error)
      return false
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log("Data channel opened")
      this.connectionState = "connected"
      this.onConnectedCallback()
    }

    channel.onclose = () => {
      console.log("Data channel closed")
      this.connectionState = "disconnected"
      this.onDisconnectedCallback()
    }

    channel.onmessage = (event) => this.handleDataChannelMessage(event)
  }

  private async handleDataChannelMessage(event: MessageEvent) {
    try {
      // Parse the message
      const message = JSON.parse(event.data)

      if (message.type === "media") {
        // Convert base64 to blob
        const binaryData = atob(message.data)
        const array = new Uint8Array(binaryData.length)
        for (let i = 0; i < binaryData.length; i++) {
          array[i] = binaryData.charCodeAt(i)
        }
        const blob = new Blob([array], { type: message.mediaType })

        // Notify about received media
        this.onMediaReceivedCallback({
          type: message.mediaType.startsWith("image/") ? "image" : "video",
          data: blob,
          id: message.id,
        })
      }
    } catch (error) {
      console.error("Error handling data channel message:", error)
    }
  }

  private async handleICECandidate(event: RTCPeerConnectionIceEvent) {
    if (event.candidate) {
      await this.sendSignalingMessage("candidate", event.candidate)
    }
  }

  private handleConnectionStateChange() {
    const state = this.peerConnection?.connectionState
    console.log("Connection state changed:", state)

    if (state === "connected") {
      this.connectionState = "connected"
      this.onConnectedCallback()
    } else if (state === "disconnected" || state === "failed" || state === "closed") {
      this.connectionState = "disconnected"
      this.onDisconnectedCallback()
      this.cleanup()
    }
  }

  private handleDataChannel(event: RTCDataChannelEvent) {
    if (!this.isInitiator) {
      this.dataChannel = event.channel
      this.setupDataChannel(this.dataChannel)
    }
  }

  private async startPolling() {
    // Poll for signaling messages every second
    this.pollingInterval = setInterval(async () => {
      if (this.connectionState === "disconnected") {
        this.stopPolling()
        return
      }

      try {
        // Poll for different message types
        if (!this.isInitiator) {
          await this.pollSignalingMessages("offer")
        } else {
          await this.pollSignalingMessages("answer")
        }

        await this.pollSignalingMessages("candidate")
      } catch (error) {
        console.error("Error polling signaling messages:", error)
      }
    }, 1000)
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  private async pollSignalingMessages(type: string) {
    let lastIndex = 0

    if (type === "offer") lastIndex = this.lastOfferIndex
    else if (type === "answer") lastIndex = this.lastAnswerIndex
    else if (type === "candidate") lastIndex = this.lastCandidateIndex

    const response = await fetch(`/api/signaling?sessionId=${this.sessionId}&type=${type}&lastIndex=${lastIndex}`)
    const data = await response.json()

    if (data.messages && data.messages.length > 0) {
      for (const message of data.messages) {
        if (type === "offer") {
          await this.handleRemoteOffer(message)
        } else if (type === "answer") {
          await this.handleRemoteAnswer(message)
        } else if (type === "candidate") {
          await this.handleRemoteICECandidate(message)
        }
      }

      // Update last index
      if (type === "offer") this.lastOfferIndex = data.lastIndex
      else if (type === "answer") this.lastAnswerIndex = data.lastIndex
      else if (type === "candidate") this.lastCandidateIndex = data.lastIndex
    }
  }

  private async handleRemoteOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

      // Create and send answer
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)

      await this.sendSignalingMessage("answer", answer)
    } catch (error) {
      console.error("Error handling remote offer:", error)
    }
  }

  private async handleRemoteAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
    } catch (error) {
      console.error("Error handling remote answer:", error)
    }
  }

  private async handleRemoteICECandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error("Error handling remote ICE candidate:", error)
    }
  }

  private async sendSignalingMessage(type: string, data: any) {
    try {
      await fetch("/api/signaling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          type,
          data,
        }),
      })
    } catch (error) {
      console.error("Error sending signaling message:", error)
    }
  }

  async sendMedia(mediaBlob: Blob, mediaType: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") {
      console.error("Data channel not open")
      return false
    }

    try {
      // Generate a unique ID for this media
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Convert blob to base64
      const arrayBuffer = await mediaBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ""
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)

      // Send media data
      const message = {
        type: "media",
        mediaType,
        id: mediaId,
        data: base64,
      }

      this.dataChannel.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error("Error sending media:", error)
      return false
    }
  }

  getConnectionState() {
    return this.connectionState
  }

  cleanup() {
    this.stopPolling()

    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Clean up session on the server
    fetch(`/api/signaling?sessionId=${this.sessionId}`, {
      method: "DELETE",
    }).catch((error) => {
      console.error("Error cleaning up session:", error)
    })
  }
}
