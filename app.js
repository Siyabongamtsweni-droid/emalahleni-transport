// MoveMate Emalahleni - customer booking requests
(() => {
  const config = window.MOVEMATE_SUPABASE_CONFIG;
  if (!config || !config.url || !config.key || !window.supabase) {
    console.error("MoveMate Supabase configuration is missing.");
    return;
  }

  const db = window.supabase.createClient(config.url, config.key);
  const tabs = document.querySelectorAll(".tab");
  const goodsFields = document.getElementById("goods-fields");
  const peopleFields = document.getElementById("people-fields");
  const form = document.getElementById("booking-form");
  const message = document.getElementById("booking-message");
  const submitButton = document.getElementById("booking-submit");
  const whenSelect = document.getElementById("when");
  const scheduleLabel = document.getElementById("schedule-label");
  const scheduledInput = document.getElementById("scheduled-for");
  let service = "goods";

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.remove("hidden");
    message.style.background = isError ? "#fff0f0" : "#ecfdf3";
    message.style.borderColor = isError ? "#f3b4b4" : "#a6e3bd";
    message.style.color = isError ? "#9b1c1c" : "#12633a";
    message.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      service = tab.dataset.service;
      goodsFields.classList.toggle("hidden", service !== "goods");
      peopleFields.classList.toggle("hidden", service !== "people");
      message.classList.add("hidden");
    });
  });

  whenSelect.addEventListener("change", () => {
    const later = whenSelect.value === "later";
    scheduleLabel.classList.toggle("hidden", !later);
    scheduledInput.required = later;
    if (!later) scheduledInput.value = "";
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.classList.add("hidden");

    const pickup = document.getElementById("pickup").value.trim();
    const dropoff = document.getElementById("dropoff").value.trim();
    if (!pickup || !dropoff) {
      showMessage("Please enter both pickup and drop-off locations.", true);
      return;
    }

    const { data: userResult, error: userError } = await db.auth.getUser();
    const user = userResult && userResult.user;
    if (userError || !user) {
      showMessage("Please log in to your MoveMate account before sending a booking request.", true);
      return;
    }

    let scheduledFor = null;
    if (whenSelect.value === "later") {
      if (!scheduledInput.value) {
        showMessage("Please choose the date and time for your booking.", true);
        return;
      }
      const selectedDate = new Date(scheduledInput.value);
      if (Number.isNaN(selectedDate.getTime()) || selectedDate.getTime() <= Date.now()) {
        showMessage("Please choose a future date and time.", true);
        return;
      }
      scheduledFor = selectedDate.toISOString();
    }

    const booking = {
      customer_id: user.id,
      service: service === "goods" ? "goods" : "passengers",
      pickup_text: pickup,
      dropoff_text: dropoff,
      scheduled_for: scheduledFor
    };

    if (service === "goods") {
      const item = document.getElementById("load").value;
      const volume = document.getElementById("volume").value;
      booking.item_description = item + " — " + volume;
    } else {
      const count = Number(document.getElementById("passengers").value);
      if (!Number.isInteger(count) || count < 1 || count > 100) {
        showMessage("Passenger count must be between 1 and 100.", true);
        return;
      }
      booking.passenger_count = count;
      booking.item_description = document.getElementById("trip-type").value;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending request...";
    try {
      const { data, error } = await db
        .from("bookings")
        .insert(booking)
        .select("id, status")
        .single();

      if (error) throw error;

      form.reset();
      service = "goods";
      tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.service === "goods"));
      goodsFields.classList.remove("hidden");
      peopleFields.classList.add("hidden");
      scheduleLabel.classList.add("hidden");
      scheduledInput.required = false;
      showMessage("Your booking request has been received. Reference: " +
        data.id + ". Current status: " + data.status +
        ". This is a request only; your trip is not confirmed until a driver accepts it.");
    } catch (error) {
      console.error("MoveMate booking error:", error);
      showMessage(error.message || "We could not send your request. Please try again.", true);
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send booking request <span>→</span>';
    }
  });
})();
