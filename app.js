const tabs = document.querySelectorAll('.tab');
const goodsFields = document.getElementById('goods-fields');
const peopleFields = document.getElementById('people-fields');
const form = document.getElementById('booking-form');
const estimate = document.getElementById('estimate');
let service = 'goods';

tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  service = tab.dataset.service;
  goodsFields.classList.toggle('hidden', service !== 'goods');
  peopleFields.classList.toggle('hidden', service !== 'people');
  estimate.classList.add('hidden');
}));

// Temporary planning estimate only. Replace straight-line distance and rates
// with a real routing provider and approved admin-configured tariffs before launch.
function roughDistanceKm(from, to) {
  const a = from.trim().toLowerCase();
  const b = to.trim().toLowerCase();
  if (a === b) return 3;
  const hash = [...(a + '|' + b)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  return 5 + (hash % 26); // placeholder, NOT an actual route distance
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const pickup = document.getElementById('pickup').value;
  const dropoff = document.getElementById('dropoff').value;
  const km = roughDistanceKm(pickup, dropoff);
  let vehicle, amount, details;

  if (service === 'goods') {
    const load = document.getElementById('load').value;
    const volume = Number(document.getElementById('volume').value);
    const base = {small: 90, medium: 150, large: 230, house: 360}[load];
    const perKm = {small: 8, medium: 11, large: 15, house: 19}[load];
    vehicle = {small:'Small delivery vehicle',medium:'Bakkie or panel van',large:'Large van or small truck',house:'Moving truck'}[load];
    amount = Math.round((base + km * perKm) * (1 + (volume - 1) * .12) / 5) * 5;
    details = 'Item category and load size are included in this illustrative estimate.';
  } else {
    const passengers = Math.max(1, Math.min(100, Number(document.getElementById('passengers').value || 1)));
    const trip = document.getElementById('trip-type').value;
    vehicle = passengers <= 4 ? 'Passenger car' : passengers <= 15 ? 'Minibus taxi' : passengers <= 30 ? 'Mid-size bus' : 'Large passenger bus';
    const base = passengers <= 4 ? 80 : passengers <= 15 ? 180 : passengers <= 30 ? 350 : 550;
    const multiplier = trip === 'return' ? 1.8 : trip === 'event' ? 2.2 : 1;
    amount = Math.round((base + km * (passengers <= 15 ? 10 : 17)) * multiplier / 5) * 5;
    details = `${passengers} passenger(s); ${trip === 'return' ? 'return trip' : trip === 'event' ? 'event / multiple pickups' : 'one-way trip'}.`;
  }

  estimate.innerHTML = `<span class="eyebrow dark">INDICATIVE ESTIMATE</span><strong>R${amount.toLocaleString('en-ZA')}</strong><p>Suggested vehicle: <b>${vehicle}</b></p><p>${details}</p><p class="note">Important: distance is currently simulated for demonstration. This is not a quote or confirmed booking. Real map routing, vehicle availability, loading labour, access conditions and verified pricing must be connected before launch.</p>`;
  estimate.classList.remove('hidden');
  estimate.scrollIntoView({behavior:'smooth', block:'nearest'});
});
