export const playSound = (soundName: 'product-click' | 'add-to-cart' | 'checkout-success') => {
  try {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.volume = 0.5; // Set volume to 50%
    audio.play().catch(error => console.warn('Error playing sound:', error));
  } catch (error) {
    console.warn('Sound error:', error);
  }
};
