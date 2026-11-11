
// ======================================
// MOVEMATE - DRIVER PORTAL
// Secure vehicle registration
// ======================================

const config = window.MOVEMATE_SUPABASE_CONFIG;

if (!config || !window.supabase) {
  alert("MoveMate could not connect. Please refresh the page.");
  throw new Error("Supabase configuration is missing.");
}

const db = window.supabase.createClient(config.url, config.key);

const intro = document.querySelector(".intro");
const grid = document.querySelector(".grid");
const driverForm = document.getElementById("driver-form");
const jobBoard = grid?.querySelectorAll(".card")[1];

function showStatus(message, color = "#805500") {
  let box = document.getElementById("driver-auth-status");

  if (!box) {
    box = document.createElement("div");
    box.id = "driver-auth-status";
    box.style.cssText =
      "background:#fff8e8;padding:16px;border-radius:12px;" +
      "margin:15px 0;line-height:1.6;font-size:14px;";
    intro.after(box);
  }

  box.style.color = color;
  box.textContent = message;
}

function addSignOutButton() {
  if (document.getElementById("driver-signout")) return;

  const button = document.createElement("button");
  button.id = "driver-signout";
  button.textContent = "Sign out";
  button.style.marginLeft = "12px";

  button.addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
  });

  document.querySelector(".top").appendChild(button);
}

async function startDriverPortal() {
  try {
    const { data, error } = await db.auth.getUser();

    if (error || !data.user) {
      window.location.href = "auth.html";
      return;
    }

    const user = data.user;

    const { data: driver, error: driverError } = await db
      .from("driver_profiles")
      .select("review_status, licence_verified")
      .eq("user_id", user.id)
      .maybeSingle();

    if (driverError) throw driverError;

    if (!driver) {
      if (grid) grid.style.display = "none";

      showStatus(
        "This account is not registered as a driver. Please register using the driver application option.",
        "#991b1b"
      );

      addSignOutButton();
      return;
    }

    addSignOutButton();

    // Never allow rejected or suspended applicants to register vehicles.
    if (
      driver.review_status === "rejected" ||
      driver.review_status === "suspended"
    ) {
      if (grid) grid.style.display = "none";

      showStatus(
        driver.review_status === "rejected"
          ? "Your driver application was not approved. Please contact MoveMate support."
          : "Your driver account is suspended. Please contact MoveMate support.",
        "#991b1b"
      );

      return;
    }

    // Hide the fictional demonstration job board.
    if (jobBoard) jobBoard.style.display = "none";

    // Keep the registration form visible for pending applicants.
    if (grid) grid.style.display = "grid";
    if (driverForm) driverForm.style.display = "grid";

    if (driver.review_status === "pending") {
      showStatus(
        "Your driver application is awaiting review. You may submit your vehicle details, but your vehicle will remain inactive until MoveMate completes the required checks."
      );
    } else if (!driver.licence_verified) {
      showStatus(
        "Your driver application is approved, but your driving licence still needs verification. You may submit vehicle details. Your vehicle will remain inactive."
      );
    } else {
      showStatus(
        "Your driver account is approved. You may register your vehicle. It will remain inactive until MoveMate completes the vehicle checks.",
        "#166534"
      );
    }

    // Load the driver's saved contact details.
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile) {
      document.getElementById("driver-name").value =
        profile.full_name || "";

      document.getElementById("driver-phone").value =
        profile.phone || "";
    }

    // Stop the old demonstration form from saving fake information.
    driverForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const submitButton = driverForm.querySelector(
        "button[type='submit']"
      );

      submitButton.disabled = true;
      submitButton.textContent = "Saving vehicle...";

      try {
        const passengers = Number(
          document.getElementById("passenger-capacity").value
        );

        const load = document
          .getElementById("load-capacity")
          .value.trim();

        if (passengers < 0 || !Number.isFinite(passengers)) {
          throw new Error("Enter a valid passenger capacity.");
        }

        if (passengers === 0 && !load) {
          throw new Error(
            "Enter a goods capacity or a passenger capacity."
          );
        }

        let service = "goods";

        if (passengers > 0 && load) {
          service = "both";
        } else if (passengers > 0) {
          service = "passengers";
        }

        const vehicle = {
          owner_id: user.id,
          vehicle_type: document
            .getElementById("vehicle-type").value,
          registration_number: document
            .getElementById("vehicle-reg")
            .value.trim().toUpperCase(),
          service: service,
          passenger_capacity: passengers,
          load_description: load || null,
          active: false
        };

        const { error: saveError } = await db
          .from("vehicles")
          .insert(vehicle);

        if (saveError) throw saveError;

        showStatus(
          "Vehicle details saved successfully. Your vehicle is inactive and cannot receive bookings until MoveMate completes its checks.",
          "#166534"
        );

        driverForm.reset();

      } catch (error) {
        showStatus(
          "Could not save vehicle: " + error.message,
          "#991b1b"
        );
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Save driver profile";
      }
    }, true);

  } catch (error) {
    showStatus(
      "Unable to load your driver account: " + error.message,
      "#991b1b"
    );
  }
}

startDriverPortal();
