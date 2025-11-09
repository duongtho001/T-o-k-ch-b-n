/**
 * Splits a long string of text into smaller chunks without breaking words,
 * prioritizing splitting at sentence or paragraph breaks.
 * @param text The full text to split.
 * @param maxChunkSize The maximum character length for each chunk.
 * @returns An array of text chunks.
 */
export function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let remainingText = text.trim();

    if (remainingText.length === 0) {
        return [];
    }

    while (remainingText.length > 0) {
        if (remainingText.length <= maxChunkSize) {
            chunks.push(remainingText);
            break;
        }

        let chunkEnd = maxChunkSize;

        // Try to find a natural breaking point (paragraph, sentence)
        const paragraphBreak = remainingText.lastIndexOf('\n\n', chunkEnd);
        const sentenceBreak = remainingText.lastIndexOf('. ', chunkEnd);
        const questionBreak = remainingText.lastIndexOf('? ', chunkEnd);
        const exclamationBreak = remainingText.lastIndexOf('! ', chunkEnd);

        const bestBreak = Math.max(paragraphBreak, sentenceBreak, questionBreak, exclamationBreak);

        if (bestBreak !== -1 && bestBreak > 0) {
            // Found a good sentence or paragraph break
             chunkEnd = bestBreak + (paragraphBreak === bestBreak ? 2 : 1) + 1;
        } else {
            // If no natural break, find the last space
            const spaceBreak = remainingText.lastIndexOf(' ', chunkEnd);
            if (spaceBreak !== -1 && spaceBreak > 0) {
                chunkEnd = spaceBreak + 1;
            }
            // If there are no spaces (a very long word), it will split at maxChunkSize
        }
        
        chunks.push(remainingText.substring(0, chunkEnd));
        remainingText = remainingText.substring(chunkEnd).trim();
    }

    return chunks;
}
