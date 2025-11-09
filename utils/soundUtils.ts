// A simple pool of Audio objects to reuse. This can help with performance
// by avoiding creating new Audio objects for every sound effect.
const audioPool: { [key: string]: HTMLAudioElement } = {};

/**
 * Plays a sound effect from a base64 data URI.
 * @param soundDataUri The base64 data URI of the sound to play.
 * @param areSoundsEnabled A boolean to check if sounds are globally enabled.
 */
export function playSound(soundDataUri: string, areSoundsEnabled: boolean): void {
  if (!areSoundsEnabled) {
    return;
  }

  try {
    // Check if an Audio object for this sound already exists and is not playing.
    let audio = audioPool[soundDataUri];
    if (audio && audio.paused) {
      audio.currentTime = 0; // Rewind to the start
    } else {
      // If it doesn't exist or the existing one is busy, create a new one.
      audio = new Audio(soundDataUri);
      audioPool[soundDataUri] = audio;
    }
    
    // Set volume to a reasonable level to not startle the user.
    audio.volume = 0.5;
    
    // Play the sound.
    audio.play().catch(error => {
      // Autoplay was prevented. This is common in browsers and requires user interaction.
      // We can safely ignore this error in this context as sounds are non-critical.
      console.warn("Sound playback was prevented:", error);
    });
  } catch (error) {
    console.error("Error playing sound:", error);
  }
}
