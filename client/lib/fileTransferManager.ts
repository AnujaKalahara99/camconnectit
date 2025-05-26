type FileMetadata = {
  type: "file";
  name: string;
  mime: string;
  size: number;
  chunks: number;
  timestamp: number;
};

export class FileTransferManager {
  private dataChannel: RTCDataChannel | undefined;
  private chunkSize: number = 16 * 1024;

  // Receiving state
  private incomingFileMeta: FileMetadata | null = null;
  private receivedChunks: Uint8Array[] = [];

  constructor(
    dataChannel?: RTCDataChannel,
    onFileReceived?: (file: File) => void,
    onProgress?: (progress: number) => void
  ) {
    if (dataChannel && onFileReceived) {
      console.log("Initializing FileTransferManager with dataChannel.");
      this.setDataChannel(dataChannel, onFileReceived, onProgress);
    }
  }

  setDataChannel(
    channel: RTCDataChannel,
    onFileReceived: (file: File) => void,
    onProgress?: (progress: number) => void
  ) {
    console.log("Setting data channel.");
    this.dataChannel = channel;

    this.dataChannel.onmessage = (event) => {
      const { data } = event;
      console.log("Data channel message received:", data);

      if (typeof data === "string") {
        if (data.startsWith("__META__")) {
          console.log("Received file metadata:", data);
          this.incomingFileMeta = JSON.parse(data.slice(8));
          this.receivedChunks = [];
        } else if (data === "__END__" && this.incomingFileMeta) {
          console.log("File transfer complete. Assembling file.");
          this.assembleFile(onFileReceived);
        }
      } else if (data instanceof ArrayBuffer && this.incomingFileMeta) {
        console.log("Received file chunk.");
        this.receivedChunks.push(new Uint8Array(data));
        if (onProgress && this.incomingFileMeta.chunks) {
          const progress =
            (this.receivedChunks.length / this.incomingFileMeta.chunks) * 100;
          console.log(`File transfer progress: ${progress.toFixed(2)}%`);
          onProgress(progress);
        }
      }
    };
  }

  sendFile(file: File) {
    console.log("Starting file transfer:", file.name);
    const totalChunks = Math.ceil(file.size / this.chunkSize);

    const metadata: FileMetadata = {
      type: "file",
      name: file.name,
      mime: file.type,
      size: file.size,
      chunks: totalChunks,
      timestamp: Date.now(),
    };

    console.log("Sending file metadata:", metadata);
    this.dataChannel?.send("__META__" + JSON.stringify(metadata));

    let offset = 0;
    const reader = new FileReader();

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + this.chunkSize);
      console.log(`Reading file chunk: offset=${offset}, size=${slice.size}`);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = () => {
      if (reader.result) {
        console.log("Sending file chunk.");
        this.dataChannel?.send(reader.result as ArrayBuffer);
        offset += this.chunkSize;
        if (offset < file.size) {
          readNextChunk();
        } else {
          console.log("File transfer complete. Sending end signal.");
          this.dataChannel?.send("__END__");
        }
      }
    };

    reader.onerror = (e) => {
      console.error("File read error:", e);
    };

    readNextChunk();
  }

  private assembleFile(callback: (file: File) => void) {
    if (!this.incomingFileMeta) return;

    console.log("Assembling file from received chunks.");
    const total = this.receivedChunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(total);
    let offset = 0;

    for (const chunk of this.receivedChunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const blob = new Blob([combined], {
      type: this.incomingFileMeta.mime || "application/octet-stream",
    });

    const file = new File([blob], this.incomingFileMeta.name, {
      type: this.incomingFileMeta.mime,
      lastModified: this.incomingFileMeta.timestamp,
    });

    console.log("File assembled:", file.name);
    callback(file);

    // Reset state
    this.incomingFileMeta = null;
    this.receivedChunks = [];
  }
}
