// interview-redirect.js
/* global renderHeader, renderFooter */
document.addEventListener("DOMContentLoaded", () => {
  // Inject header/footer
  if (typeof renderHeader === "function") renderHeader("#site-header");
  if (typeof renderFooter === "function") renderFooter("#site-footer");

  // Elements
  const startBtn = document.querySelector(".start-btn");
  const answerInput = document.querySelector(".answer-input");
  const recordingEmoji = document.querySelector(".recording-emoji");
  const recordingText = document.querySelector(".recording-text");

  // Step 1: Start the interview
  startBtn.addEventListener("click", () => {
    answerInput.classList.remove("hidden");
    startBtn.disabled = true;
    startBtn.textContent = "Recording...";
    recordingEmoji.classList.remove("hidden");
  });

  // Step 2: Detect when user "submits" answer
  answerInput.addEventListener("input", () => {
    const finished = answerInput.value.trim().length > 0;
    const submitExists = document.querySelector(".submit-btn");

    if (finished && !submitExists) {
      // Add a Finish button dynamically
      const finishBtn = document.createElement("button");
      finishBtn.textContent = "Finish";
      finishBtn.className = "submit-btn bg-primary hover:bg-primary/90 text-background-dark px-5 py-2 rounded-xl font-bold mt-4";
      answerInput.insertAdjacentElement("afterend", finishBtn);

      finishBtn.addEventListener("click", () => {
        // Hide recording indicator
        recordingEmoji.classList.add("hidden");
        recordingText.textContent = "Completed";

        // Optional: disable input
        answerInput.disabled = true;
        finishBtn.disabled = true;

        // Redirect after 1 second to show completed status
        setTimeout(() => {
          window.location.href = "/feedback.html";
        }, 1000);
      });
    }
  });
});
