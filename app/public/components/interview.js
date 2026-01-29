document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.question-card').forEach(card => {
    const startBtn = card.querySelector('.start-btn');
    const recordingEmoji = card.querySelector('.recording-emoji');
    const recordingText = card.querySelector('.recording-text');
    const input = card.querySelector('.answer-input');

    startBtn.addEventListener('click', () => {
      // Hide start button
      startBtn.classList.add('hidden');

      // Show emoji and change text
      recordingEmoji.classList.remove('hidden');
      recordingText.textContent = "Recording...";
      recordingText.classList.add('animate-recording');

      // Show answer input
      input.classList.remove('hidden');
      input.focus();
    });
  });
});
