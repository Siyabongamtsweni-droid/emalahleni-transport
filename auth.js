// ======================================
// MOVEMATE EMALAHLENI
// Authentication and Account Management
// ======================================

const config = window.MOVEMATE_SUPABASE_CONFIG;

if (!config || !window.supabase) {
  throw new Error("MoveMate could not load its Supabase configuration.");
}

const db = window.supabase.createClient(
  config.url,
  config.key
);

// Page elements
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");

const signupSection = document.getElementById("signup-section");
const loginSection = document.getElementById("login-section");

const messageBox = document.getElementById("auth-message");

const signupButton = document.getElementById("signup-button");
const loginButton = document.getElementById("login-button");

// Display messages
function showMessage(message, success = false) {
  messageBox.textContent = message;
  messageBox.style.display = "block";

  messageBox.style.background = success
    ? "#dcfce7"
    : "#fee2e2";

  messageBox.style.color = success
    ? "#166534"
    : "#991b1b";
}

// Switch between registration and login
document.getElementById("show-login").addEventListener("click", (event) => {
  event.preventDefault();

  signupSection.classList.add("hidden");
  loginSection.classList.remove("hidden");

  messageBox.style.display = "none";
});

document.getElementById("show-signup").addEventListener("click", (event) => {
  event.preventDefault();

  loginSection.classList.add("hidden");
  signupSection.classList.remove("hidden");

  messageBox.style.display = "none";
});

// ======================================
// REGISTER NEW ACCOUNT
// ======================================

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  signupButton.disabled = true;
  signupButton.textContent = "Creating account...";

  const fullName = document
    .getElementById("full-name")
    .value.trim();

  const phone = document
    .getElementById("phone")
    .value.trim();

  const accountType = document
    .getElementById("account-type")
    .value;

  const email = document
    .getElementById("signup-email")
    .value.trim();

  const password = document
    .getElementById("signup-password")
    .value;

  try {
    if (!fullName || !phone || !email || !password) {
      throw new Error("Please complete all the required fields.");
    }

    const { data, error } = await db.auth.signUp({
      email: email,
      password: password,

      options: {
        data: {
          full_name: fullName,
          phone: phone,
          account_type: accountType
        }
      }
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      showMessage(
        "Your account has been created successfully. Redirecting...",
        true
      );

      if (accountType === "driver") {
        window.location.href = "driver.html";
      } else {
        window.location.href = "index.html";
      }

    } else {
      showMessage(
        "Registration received! Please check your email and confirm your account before logging in.",
        true
      );

      signupForm.reset();
    }

  } catch (error) {
    showMessage(error.message);

  } finally {
    signupButton.disabled = false;
    signupButton.textContent = "Create account";
  }
});

// ======================================
// LOGIN EXISTING ACCOUNT
// ======================================

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  const email = document
    .getElementById("login-email")
    .value.trim();

  const password = document
    .getElementById("login-password")
    .value;

  try {
    const { data, error } = await db.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      throw error;
    }

    const user = data.user;

    showMessage("Login successful. Redirecting...", true);

    // Check whether this account is a driver applicant
    const { data: driver, error: driverError } = await db
      .from("driver_profiles")
      .select("review_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (driverError) {
      throw driverError;
    }

    if (driver) {
      window.location.href = "driver.html";
    } else {
      window.location.href = "index.html";
    }

  } catch (error) {
    showMessage(error.message);

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Log in";
  }
});

