document.addEventListener("DOMContentLoaded", () => {
  const AUTH_MODE_LOGIN = "Login";
  const AUTH_MODE_SIGNUP = "Sign Up";
  const APP_REDIRECT_PATH = "/interview.html";
  const urlMode =
    new URLSearchParams(window.location.search).get("mode")?.toLowerCase() || "";

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
            <label id="login-tab" class="tab flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-[#9abcb8] text-sm font-bold transition-all duration-300">
              <span class="truncate">Login</span>
              <input type="radio" name="auth-mode" value="Login" class="hidden" checked />
            </label>
            <label id="signup-tab" class="tab flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 text-[#9abcb8] text-sm font-bold transition-all duration-300">
              <span class="truncate">Sign Up</span>
              <input type="radio" name="auth-mode" value="Sign Up" class="hidden" />
            </label>
          </div>

          <!-- Form -->
          <form id="auth-form" class="space-y-5">
            <!-- Full Name (only signup) -->
            <div class="space-y-2 group hidden" id="fullname-field">
              <label for="full-name-input" class="text-xs font-bold uppercase tracking-wider text-[#9abcb8] ml-1">Full Name</label>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">badge</span>
                <input id="full-name-input" type="text" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="John Doe" autocomplete="name" />
              </div>
            </div>

            <div class="space-y-2 group">
              <label for="email-input" class="text-xs font-bold uppercase tracking-wider text-[#9abcb8] ml-1">Email Address</label>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">alternate_email</span>
                <input id="email-input" type="email" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="student@university.edu" autocomplete="email" required />
              </div>
            </div>

            <div class="space-y-2 group">
              <div class="flex justify-between items-center px-1">
                <label for="password-input" class="text-xs font-bold uppercase tracking-wider text-[#9abcb8]">Password</label>
                <a class="text-xs text-primary hover:underline font-medium" href="#">Reset?</a>
              </div>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">lock_open</span>
                <input id="password-input" type="password" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="••••••••" autocomplete="current-password" required />
              </div>
            </div>

            <!-- Confirm password (signup only) -->
            <div class="space-y-2 group hidden" id="confirm-password-field">
              <label for="confirm-password-input" class="text-xs font-bold uppercase tracking-wider text-[#9abcb8] ml-1">Confirm Password</label>
              <div class="relative input-focus-glow rounded-lg">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#9abcb8] text-xl">lock</span>
                <input id="confirm-password-input" type="password" class="w-full h-14 pl-12 pr-4 bg-[#1b2826]/50 border border-[#395653] focus:border-primary focus:ring-0 rounded-lg text-white placeholder:text-[#9abcb8]/40 transition-all outline-none" placeholder="••••••••" autocomplete="new-password" />
              </div>
            </div>

            <p id="auth-message" class="hidden text-sm px-1"></p>

            <button id="auth-submit-button" class="w-full h-14 bg-primary text-background-dark font-bold rounded-lg shadow-[0_0_20px_rgba(0,230,207,0.3)] hover:shadow-[0_0_30px_rgba(0,230,207,0.5)] transition-all duration-300 flex items-center justify-center gap-2 mt-4 group disabled:opacity-60 disabled:cursor-not-allowed" type="submit">
              <span id="auth-submit-label">Login</span>
              <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>

          <!-- Google login -->
          <div class="mt-10 grid place-items-center">
            <button type="button" class="flex items-center justify-center h-12 rounded-lg bg-[#273a38]/30 border border-white/5 hover:bg-[#273a38]/50 hover:border-white/20 transition-all gap-2 text-sm font-medium">
              <img src="./google.png" alt="Google Logo" class="size-4 brightness-200" />
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const loginFormContainer = document.getElementById("login-form");
  if (!loginFormContainer) {
    return;
  }

  loginFormContainer.innerHTML = formHTML;

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const modeInputs = Array.from(
    document.querySelectorAll('input[name="auth-mode"]')
  );
  const fullnameField = document.getElementById("fullname-field");
  const confirmPasswordField = document.getElementById("confirm-password-field");
  const fullNameInput = document.getElementById("full-name-input");
  const emailInput = document.getElementById("email-input");
  const passwordInput = document.getElementById("password-input");
  const confirmPasswordInput = document.getElementById("confirm-password-input");
  const authForm = document.getElementById("auth-form");
  const authSubmitButton = document.getElementById("auth-submit-button");
  const authSubmitLabel = document.getElementById("auth-submit-label");
  const authMessage = document.getElementById("auth-message");

  if (
    !authForm ||
    !fullNameInput ||
    !emailInput ||
    !passwordInput ||
    !confirmPasswordInput
  ) {
    return;
  }

  const getActiveMode = () => {
    const activeInput = document.querySelector('input[name="auth-mode"]:checked');
    return activeInput ? activeInput.value : AUTH_MODE_LOGIN;
  };

  const setAuthMessage = (message, isError = true) => {
    if (!authMessage) {
      return;
    }

    authMessage.textContent = message;
    authMessage.classList.remove("hidden", "text-red-300", "text-primary");
    authMessage.classList.add(isError ? "text-red-300" : "text-primary");
  };

  const clearAuthMessage = () => {
    if (!authMessage) {
      return;
    }

    authMessage.textContent = "";
    authMessage.classList.add("hidden");
    authMessage.classList.remove("text-red-300", "text-primary");
  };

  const setSubmittingState = (isSubmitting) => {
    if (authSubmitButton) {
      authSubmitButton.disabled = isSubmitting;
    }
    if (authSubmitLabel) {
      authSubmitLabel.textContent = isSubmitting
        ? "Working..."
        : getActiveMode() === AUTH_MODE_LOGIN
          ? "Login"
          : "Create Account";
    }
  };

  const applyModeState = (mode) => {
    modeInputs.forEach((modeInput) => {
      modeInput.checked = modeInput.value === mode;
    });

    tabs.forEach((tab) => {
      const input = tab.querySelector("input");
      const isActive = input && input.value === mode;
      tab.classList.toggle("bg-primary", isActive);
      tab.classList.toggle("text-background-dark", isActive);
      tab.classList.toggle("text-[#9abcb8]", !isActive);
    });

    const isLoginMode = mode === AUTH_MODE_LOGIN;
    if (fullnameField) {
      fullnameField.classList.toggle("hidden", isLoginMode);
    }
    if (confirmPasswordField) {
      confirmPasswordField.classList.toggle("hidden", isLoginMode);
    }
    if (fullNameInput) {
      fullNameInput.required = !isLoginMode;
    }
    if (confirmPasswordInput) {
      confirmPasswordInput.required = !isLoginMode;
    }
    if (passwordInput) {
      passwordInput.autocomplete = isLoginMode ? "current-password" : "new-password";
    }
    if (authSubmitLabel) {
      authSubmitLabel.textContent = isLoginMode ? "Login" : "Create Account";
    }
  };

  const splitName = (fullName) => {
    const nameParts = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    return { firstName, lastName };
  };

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "include",
      ...options,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return { ok: response.ok, status: response.status, payload };
  };

  modeInputs.forEach((modeInput) => {
    modeInput.addEventListener("change", () => {
      applyModeState(modeInput.value);
      clearAuthMessage();
    });
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAuthMessage();

    const mode = getActiveMode();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
      setAuthMessage("Email and password are required.");
      return;
    }

    setSubmittingState(true);

    try {
      if (mode === AUTH_MODE_SIGNUP) {
        const fullName = fullNameInput.value.trim();
        const confirmPassword = confirmPasswordInput.value;

        if (!fullName) {
          setAuthMessage("Please enter your full name.");
          return;
        }

        if (password !== confirmPassword) {
          setAuthMessage("Passwords do not match.");
          return;
        }

        const { firstName, lastName } = splitName(fullName);
        const signupResult = await apiRequest("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        if (!signupResult.ok) {
          const signupError =
            signupResult.payload?.error?.message || "Unable to create account.";
          setAuthMessage(signupError);
          return;
        }

        const signedUpUser =
          signupResult.payload?.user ||
          (await apiRequest("/api/auth/me")).payload?.user;
        if (signedUpUser && typeof signedUpUser === "object") {
          localStorage.setItem("user", JSON.stringify(signedUpUser));
        }

        window.location.href = APP_REDIRECT_PATH;
        return;
      }

      const loginResult = await apiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginResult.ok) {
        const loggedInUser =
          loginResult.payload?.user ||
          (await apiRequest("/api/auth/me")).payload?.user;
        if (loggedInUser && typeof loggedInUser === "object") {
          localStorage.setItem("user", JSON.stringify(loggedInUser));
        }
        window.location.href = APP_REDIRECT_PATH;
        return;
      }

      // If signup created a server session already, convert that into frontend state.
      if (loginResult.payload?.error?.code === "ALREADY_AUTHENTICATED") {
        const meResult = await apiRequest("/api/auth/me");
        if (meResult.ok) {
          localStorage.setItem("user", JSON.stringify(meResult.payload?.user));
          window.location.href = APP_REDIRECT_PATH;
          return;
        }
      }

      const loginError =
        loginResult.payload?.error?.message || "Unable to login. Please try again.";
      setAuthMessage(loginError);
    } catch (error) {
      setAuthMessage(error.message || "Something went wrong. Please try again.");
    } finally {
      setSubmittingState(false);
    }
  });

  // Support deep-linking into signup mode from navigation.
  const initialMode =
    urlMode === "signup" || urlMode === "register"
      ? AUTH_MODE_SIGNUP
      : AUTH_MODE_LOGIN;
  applyModeState(initialMode);
});
