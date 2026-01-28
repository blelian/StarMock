document.addEventListener("DOMContentLoaded", () => {
  const brandPanel = document.getElementById("brand-panel");
  if (brandPanel) {
    brandPanel.innerHTML = `
      <div class="z-10 flex flex-col justify-between h-full items-center">
        <!-- Neon Circular Blob -->
        <div class="neon-blob mt-24 mb-2">
          Master the <span class="text-white italic">STAR</span> Method with AI
        </div>

        <!-- Logo + Title -->
        <div class="flex items-center gap-3 mb-1">
          <div class="size-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/40 shadow-[0_0_20px_rgba(0,230,207,0.2)]">
            <span class="material-symbols-outlined text-primary scale-125">auto_awesome</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight">StarMock</h2>
        </div>

        <!-- AI Engine Status -->
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full 
                    bg-primary/10 border border-primary/20 text-primary text-xs 
                    font-bold uppercase tracking-widest mb-4">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          AI Engine Active
        </div>

        <!-- Description -->
        <p class="text-[#9abcb8] text-lg max-w-md leading-relaxed text-center mt-auto mb-24">
          Precision practice for the next generation of leaders. Real-time feedback, behavioral analysis, and career-defining preparation.
        </p>
            
      </div>
    `;

    // Mobile logo
    const mobileLogo = document.getElementById("mobile-logo");
    if (mobileLogo) {
      mobileLogo.innerHTML = `
        <div class="flex justify-center mb-10">
          <div class="flex items-center gap-3">
            <div class="size-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/40">
              <span class="material-symbols-outlined text-primary scale-110">auto_awesome</span>
            </div>
            <h2 class="text-xl font-bold">StarMock</h2>
          </div>
        </div>
      `;
    }
  }
});
