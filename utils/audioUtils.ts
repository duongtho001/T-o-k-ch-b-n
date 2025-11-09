

/**
 * Decodes a base64 string into a Uint8Array.
 * @param base64 The base64 encoded string.
 * @returns A Uint8Array of the decoded data.
 */
export function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encodes a Uint8Array into a base64 string.
 * @param bytes The Uint8Array to encode.
 * @returns A base64 encoded string.
 */
export function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Concatenates multiple raw PCM audio chunks into a single Uint8Array.
 * @param pcmChunks An array of Uint8Arrays, each representing a chunk of PCM audio.
 * @returns A single Uint8Array containing all the concatenated audio data.
 */
export function concatenatePcmAudio(pcmChunks: Uint8Array[]): Uint8Array {
    const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of pcmChunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}


interface WavHeaderOptions {
    numChannels: number;
    sampleRate: number;
    bitsPerSample: number;
}

/**
 * Converts raw PCM audio data into a WAV file blob.
 * @param pcmData The raw PCM data as a Uint8Array.
 * @param options Configuration for the WAV header.
 * @returns A Blob representing the WAV file.
 */
export function pcmToWav(pcmData: Uint8Array, options: WavHeaderOptions): Blob {
    const { numChannels, sampleRate, bitsPerSample } = options;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const fileSize = 36 + dataSize;

    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    return new Blob([view, pcmData], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}
