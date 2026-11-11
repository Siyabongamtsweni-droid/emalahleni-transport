// ======================================
// MOVEMATE - SECURE DRIVER PORTAL
// ======================================

const config = window.MOVEMATE_SUPABASE_CONFIG;

const db = window.supabase.createClient(
  config.url,
  config.key
);

const intro = document.querySelector(".intro");
const grid = document.querySelector(".grid");
const driverForm = document.getElementById("driver-form");
const jobBoard = document.querySelectorAll(".grid .card")[1];

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
  const button = document.createElement("button");
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
      showStatus(
        "This account is not registered as a driver. Please apply using the driver registration option.",
        "#991b1b"
      );
      grid.style.display = "none";
      addSignOutButton();
      return;
    }

    addSignOutButton();

    if (driver.review_status !== "approved") {
      grid.style.display = "none";

      const messages = {
        pending: "Your driver application is awaiting review. You will be able to register vehicles once your application is approved.",
        rejected: "Your driver application was not approved. Please contact MoveMate support.",
        suspended: "Your driver account is currently suspended. Please contact MoveMate support."
      };

      showStatus(
        messages[driver.review_status] ||
        "Your driver account is not approved yet."
      );

      return;
    }

    if (!driver.licence_verified) {
      grid.style.display = "none";
      showStatus(
        "Your driver application has been approved, but your licence verification is still outstanding. Please contact MoveMate support."
      );
      return;
    }

    showStatus(
      "Your driver account is approved. You can now register your vehicle.",
      "#166534"
    );

    // Hide the demonstration job board.
    if (jobBoard) jobBoard.style.display = "none";

    const { data: profile } = await db
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();

    if (profile) {
      document.getElementById("driver-name").value =
        profile.full_name || "";

      document.getElementById("driver-phone").value =
        profile.phone || "";
    }

    // Prevent the old demonstration form from saving fake data.
    driverForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const submitButton = driverForm.querySelector("button[type='submit']");
      submitButton.disabled = true;
      submitButton.textContent = "Saving vehicle...";

      try {
        const passengers = Number(
          document.getElementById("passenger-capacity").value
        );

        const load = document
          .getElementById("load-capacity")
          .value.trim();

        let service = "goods";

        if (passengers > 0 && load) {
          service = "both";
        } else if (passengers > 0) {
          service = "passengers";
        }

        const vehicle = {
          owner_id: user.id,
          vehicle_type: document.getElementById("vehicle-type").value,
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
          "Vehicle details saved successfully. Your vehicle remains inactive until the required checks are completed.",
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
