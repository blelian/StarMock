document.addEventListener("DOMContentLoaded", () => {
  const formHTML = `
    <div class="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative">
      <div class="w-full max-w-[480px]">

        <!-- Mobile Logo -->
        <div class="lg:hidden flex justify-center mb-10">
          <div class="flex items-center gap-3">
            <div class="size-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/40">
              <span class="material-symbols-outlined text-primary scale-110">auto_awesome</span>
            </div>
            <h2 class="text-xl font-bold">StarMock</h2>
          </div>
        </div>

        <!-- Glass Card -->
        <div class="glass rounded-xl p-8 lg:p-10 shadow-2xl relative overflow-hidden">
          <div class="scanline"></div>
          <div class="mb-8">
            <h3 class="text-2xl font-bold mb-2">Initialize Session</h3>
            <p class="text-[#9abcb8] text-sm">Select your authentication protocol to proceed.</p>
          </div>

          <!-- Tabs -->
          <div class="flex h-12 items-center justify-center rounded-lg bg-[#273a38]/40 p-1 mb-8">
            <label class="tab flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-[#9abcb8] text-sm font-bold transition-all duration-300">
              <span class="truncate">Login</span>
              <input type="radio" name="auth-mode" value="Login" class="hidden" checked/>
            </label>
            <label class="tab flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-[#9abcb8] text-sm font-bold transition-all duration-300">
              <span class="truncate">Sign Up</span>
              <input type="radio" name="auth-mode" value="Sign Up" class="hidden"/>
            </label>
          </div>

          <!-- Form -->
          <form id="auth-form" class="space-y-5">
            <!-- Full Name (only signup) -->
            <div class="space-y-2 group hidden" id="fullname-field">
              <label class="text-xs font-bold uppercase tracking-wider text-[#9abcb8] ml-1">Full Name</label>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">badge</span>
                <input id="auth-name" type="text" name="name" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="John Doe"/>
              </div>
            </div>

            <div class="space-y-2 group">
              <label class="text-xs font-bold uppercase tracking-wider text-[#9abcb8] ml-1">Email Address</label>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">alternate_email</span>
                <input id="auth-email" type="email" name="email" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="student@university.edu" required/>
              </div>
            </div>

            <div class="space-y-2 group">
              <div class="flex justify-between items-center px-1">
                <label class="text-xs font-bold uppercase tracking-wider text-[#9abcb8]">Password</label>
                <a class="text-xs text-primary hover:underline font-medium" href="#">Reset?</a>
              </div>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">lock_open</span>
                <input id="auth-password" type="password" name="password" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="••••••••" required/>
              </div>
            </div>

            <!-- Confirm password (signup only) -->
            <div class="space-y-2 group hidden" id="confirm-password-field">
              <label class="text-xs font-bold uppercase tracking-wider text-[#9abcb8] ml-1">Confirm Password</label>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">lock</span>
                <input id="auth-confirm-password" type="password" name="confirmPassword" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="••••••••"/>
              </div>
            </div>

            <div id="auth-error" class="hidden text-sm text-red-400 mt-2"></div>

            <button class="w-full h-14 bg-primary text-background-dark font-bold rounded-lg shadow-[0_0_20px_rgba(0,230,207,0.3)] hover:shadow-[0_0_30px_rgba(0,230,207,0.5)] transition-all duration-300 flex items-center justify-center gap-2 mt-4 group" type="submit">
              Confirm
              <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>

          <!-- Google login -->
          <div class="mt-10 grid place-items-center">
            <button class="flex items-center justify-center h-12 rounded-lg bg-[#273a38]/30 border border-white/5 hover:bg-[#273a38]/50 hover:border-white/20 transition-all gap-2 text-sm font-medium">
              <img src="./google.png" alt="Google Logo" class="size-4 brightness-200"/>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("login-form").innerHTML = formHTML;

  // Tab toggle
  const tabs = document.querySelectorAll(".tab");
  const fullnameField = document.getElementById("fullname-field");
  const confirmPasswordField = document.getElementById("confirm-password-field");

  const checkedTab = document.querySelector('.tab input:checked')?.closest('.tab');
  if (checkedTab) checkedTab.classList.add("bg-primary", "text-background-dark");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("bg-primary", "text-background-dark"));
      tab.classList.add("bg-primary", "text-background-dark");

      const mode = tab.querySelector("input").value;
      if (mode === "Login") {
        fullnameField.classList.add("hidden");
        confirmPasswordField.classList.add("hidden");
      } else {
        fullnameField.classList.remove("hidden");
        confirmPasswordField.classList.remove("hidden");
      }
    });
  });

  // Auth API: relative /api (proxied in dev by Vite); set window.STARMOCK_API_BASE if API is on another origin
  const API_BASE = (typeof window !== "undefined" && window.STARMOCK_API_BASE) ? window.STARMOCK_API_BASE : "";

  const form = document.getElementById("auth-form");
  const errorEl = document.getElementById("auth-error");

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove("hidden");
    }
  }

  function clearError() {
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.add("hidden");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const authMode = document.querySelector('input[name="auth-mode"]:checked')?.value;
    const email = document.getElementById("auth-email")?.value?.trim();
    const password = document.getElementById("auth-password")?.value;

    if (!email || !password) {
      showError("Email and password are required.");
      return;
    }

    if (authMode === "Sign Up") {
      const confirmPassword = document.getElementById("auth-confirm-password")?.value;
      if (password !== confirmPassword) {
        showError("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        showError("Password must be at least 6 characters.");
        return;
      }
    }

    const url = authMode === "Sign Up"
      ? `${API_BASE}/api/auth/register`
      : `${API_BASE}/api/auth/login`;
    const body = authMode === "Sign Up"
      ? { email, password, name: document.getElementById("auth-name")?.value?.trim() || undefined }
      : { email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (data.token) {
        localStorage.setItem("starmock_token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        window.location.href = "/dashboard.html";
      } else {
        showError("Invalid response from server.");
      }
    } catch (err) {
      showError("Network error. Is the backend running?");
    }
  });
});
