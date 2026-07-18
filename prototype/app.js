/* AssureCars — Interactive Prototype logic */
(function () {
  "use strict";

  // ============================ Assets & Data ============================
  const carSVG = () => `
<svg viewBox="0 0 240 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M18 74 C20 50 34 48 52 46 L74 44 C88 30 108 26 132 27 C156 28 176 34 190 52 L214 60 C224 63 226 70 226 78 L226 82 C226 86 222 88 216 88 L206 88 A16 16 0 0 0 174 88 L92 88 A16 16 0 0 0 60 88 L26 88 C20 88 16 84 16 78 Z" fill="#ffffff"/>
  <path d="M82 44 L100 33 C110 31 120 31 128 32 L128 47 Z" fill="#b9c6dc"/>
  <path d="M134 32 C150 33 166 39 178 50 L134 50 Z" fill="#b9c6dc"/>
  <circle cx="76" cy="88" r="15" fill="#1f2937"/><circle cx="76" cy="88" r="6" fill="#9aa6b8"/>
  <circle cx="190" cy="88" r="15" fill="#1f2937"/><circle cx="190" cy="88" r="6" fill="#9aa6b8"/>
</svg>`;

  const cars = [
    { id: "c1", name: "Toyota Fortuner", variant: "2.8 4x4 AT · Legender", year: 2022, km: "38,400", fuel: "Diesel", trans: "Automatic", owner: "1st", price: "38.75", emi: "72,100", grad: "g1", score: 96, grade: "A", hub: "Whitefield Hub", source: "Owned", color: "Pearl White" },
    { id: "c2", name: "Hyundai Creta", variant: "1.5 SX(O) Turbo", year: 2023, km: "19,250", fuel: "Petrol", trans: "DCT", owner: "1st", price: "17.40", emi: "32,400", grad: "g2", score: 94, grade: "A", hub: "Indiranagar Hub", source: "ConsignedIndividual", color: "Fiery Red" },
    { id: "c3", name: "Mahindra XUV700", variant: "AX7 L Diesel AT", year: 2022, km: "41,900", fuel: "Diesel", trans: "Automatic", owner: "1st", price: "22.10", emi: "41,150", grad: "g3", score: 91, grade: "A", hub: "Whitefield Hub", source: "Owned", color: "Everest White" },
    { id: "c4", name: "Kia Seltos", variant: "GTX+ 1.4 DCT", year: 2021, km: "52,600", fuel: "Petrol", trans: "DCT", owner: "2nd", price: "15.25", emi: "28,400", grad: "g4", score: 89, grade: "B+", hub: "Koramangala Hub", source: "ConsignedVendor", color: "Gravity Grey" },
    { id: "c5", name: "Honda City", variant: "ZX CVT Petrol", year: 2023, km: "12,800", fuel: "Petrol", trans: "CVT", owner: "1st", price: "14.90", emi: "27,700", grad: "g5", score: 95, grade: "A", hub: "Indiranagar Hub", source: "Owned", color: "Platinum Silver" },
    { id: "c6", name: "Maruti Grand Vitara", variant: "Alpha+ Hybrid", year: 2023, km: "16,300", fuel: "Hybrid", trans: "e-CVT", owner: "1st", price: "18.60", emi: "34,600", grad: "g1", score: 93, grade: "A", hub: "Whitefield Hub", source: "Owned", color: "Midnight Black" }
  ];
  const carById = (id) => cars.find((c) => c.id === id) || cars[0];
  // Buyers see the hub (name + area + distance). Hub *scoping* only restricts staff.
  const areaOf = (c) => ({ "Whitefield Hub": "Whitefield, Bengaluru", "Indiranagar Hub": "Indiranagar, Bengaluru", "Koramangala Hub": "Koramangala, Bengaluru" }[c.hub] || "Bengaluru");
  const distOf = (c) => ({ "Whitefield Hub": "4 km", "Indiranagar Hub": "7 km", "Koramangala Hub": "9 km" }[c.hub] || "");
  let currentCarId = "c1";

  // ============================ Small helpers ============================
  const carImg = (c, cls = "") =>
    `<div class="car-img ${c.grad} ${cls}">${carSVG()}</div>`;

  const chip = (t, cls = "") => `<span class="chip ${cls}">${t}</span>`;

  const carCard = (c) => `
    <div class="car-card" data-go="app-detail" data-car="${c.id}">
      <div class="car-img ${c.grad}">
        ${carSVG()}
        <div class="imgtag">${chip("✔ Certified", "green")}</div>
        <div class="imgfav">♡</div>
      </div>
      <div class="cc-body">
        <div class="cc-name">${c.name}</div>
        <div class="cc-sub">${c.year} · ${c.variant}</div>
        <div class="cc-meta">
          ${chip(c.km + " km")}${chip(c.fuel)}${chip(c.trans)}
        </div>
        <div class="cc-price">
          <div><div class="p">₹${c.price} L</div><div class="emi">EMI ₹${c.emi}/mo</div></div>
          <span class="chip teal">Grade ${c.grade}</span>
        </div>
      </div>
    </div>`;

  const statusbar = () => `
    <div class="app-statusbar" style="display:flex;align-items:center;justify-content:space-between;padding:0 26px;color:var(--ink-900);font-size:13px;font-weight:700;">
      <span style="padding-top:8px">9:41</span>
      <span style="padding-top:8px">📶 🔋</span>
    </div>`;

  // ============================ MOBILE APP ============================
  const tabbar = (active) => `
    <div class="tabbar">
      <button class="tab ${active === "home" ? "active" : ""}" data-go="app-home"><span class="ti">🏠</span>Home</button>
      <button class="tab ${active === "search" ? "active" : ""}" data-go="app-search"><span class="ti">🔍</span>Buy</button>
      <button class="tab fab" data-go="app-services"><span class="ti">＋</span></button>
      <button class="tab" data-go="app-bookings"><span class="ti">📅</span>Drives</button>
      <button class="tab" data-go="app-account"><span class="ti">👤</span>Account</button>
    </div>`;

  const appHome = () => `
    <div class="screen active" id="app-home">
      ${statusbar()}
      <div class="app-topbar">
        <div class="app-loc">
          <span class="lbl">DELIVER TO</span>
          <span class="val">Bengaluru ▾</span>
        </div>
        <button class="icon-btn" style="margin-left:auto" data-go="app-notifications">🔔</button>
      </div>
      <div style="padding:0 0 4px"><div class="searchbar" data-go="app-search"><span>🔍</span> Search by make, model, budget…<span class="flt" data-go="app-filters">Filter</span></div></div>
      <div class="app-body">
        <div class="hero-banner">
          <h3>Certified. Inspected. Assured.</h3>
          <p>Every car passes a 200-point inspection with a shareable PDF report.</p>
        </div>
        <div class="pad">
          <div class="quick-actions">
            <button class="qa" data-go="app-search"><div class="qi" style="background:var(--teal-050);color:var(--teal-600)">🚗</div><div class="qt">Buy Car</div></button>
            <button class="qa" data-go="app-services"><div class="qi" style="background:var(--amber-050);color:#b9770e">💰</div><div class="qt">Sell Car</div></button>
            <button class="qa" data-go="app-services"><div class="qi" style="background:var(--emerald-050);color:var(--emerald-500)">🔧</div><div class="qt">PDI Check</div></button>
            <button class="qa" data-go="app-bookings"><div class="qi" style="background:#eef2ff;color:#4f46e5">📅</div><div class="qt">My Drives</div></button>
          </div>
        </div>
        <div class="pad-x row between"><div class="section-title">Handpicked for you</div><span class="tiny" style="color:var(--teal-600);font-weight:700" data-go="app-search">See all</span></div>
        <div class="hlist mt12">${cars.slice(0, 3).map(carCard).join("")}</div>
        <div class="pad-x row between mt16"><div class="section-title">Recently added</div></div>
        <div class="pad" style="display:flex;flex-direction:column;gap:14px">${cars.slice(3, 5).map(carCard).join("")}</div>
      </div>
      ${tabbar("home")}
    </div>`;

  const filterPills = ["All", "SUV", "Sedan", "< ₹15L", "Automatic", "Petrol", "< 30k km", "1st owner"];
  const appSearch = () => `
    <div class="screen" id="app-search">
      ${statusbar()}
      <div class="app-topbar">
        <button class="icon-btn" data-go="app-home">←</button>
        <div class="searchbar" style="margin:0;flex:1"><span>🔍</span> SUV under ₹25L</div>
        <button class="icon-btn" data-go="app-filters">⚙</button>
      </div>
      <div class="pad-x mt8"><div class="pill-row">${filterPills.map((p, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}" ${i === 0 ? "" : 'data-go="app-filters"'}>${p}</span>`).join("")}</div></div>
      <div class="pad-x row between mt12"><span class="tiny muted"><b style="color:var(--ink-900)">${cars.length} cars</b> in Bengaluru</span><span class="tiny" style="color:var(--teal-600);font-weight:700" data-go="app-filters">↕ Sort & Filter</span></div>
      <div class="app-body">
        <div class="pad" style="display:flex;flex-direction:column;gap:14px">${cars.map(carCard).join("")}</div>
      </div>
      ${tabbar("search")}
    </div>`;

  const reportRow = (label, val, ok = true) =>
    `<div class="report-row"><span>${ok ? "🟢" : "🟠"}</span> ${label} <span class="st" style="color:${ok ? "var(--emerald-500)" : "var(--amber-500)"}">${val}</span></div>`;

  const appDetail = () => {
    const c = carById(currentCarId);
    return `
    <div class="screen" id="app-detail">
      <div class="detail-hero car-img ${c.grad}">
        <button class="back" data-go="app-search">←</button>
        <div style="position:absolute;top:14px;right:14px;z-index:5" class="row gap8">
          <button class="icon-btn" style="background:rgba(255,255,255,.9)">♡</button>
          <button class="icon-btn" style="background:rgba(255,255,255,.9)">↗</button>
        </div>
        ${carSVG()}
        <div class="thumbs"><i class="on"></i><i></i><i></i><i></i></div>
      </div>
      <div class="app-body" style="padding-bottom:0">
        <div class="detail-body">
          <div class="row between">
            <div>
              <div style="font-size:21px;font-weight:800">${c.name}</div>
              <div class="tiny muted mt8">${c.year} · ${c.variant} · ${c.color}</div>
            </div>
            <span class="chip teal">Grade ${c.grade}</span>
          </div>
          <div class="row gap8 mt12 wrap">${chip("✔ Certified", "green")}${chip("🏢 " + c.hub)}${chip("📍 " + areaOf(c) + " · " + distOf(c))}${chip(c.owner + " owner")}</div>

          <div class="quick-row mt16">
            <button class="qbtn"><span class="qbi">♡</span>Save</button>
            <button class="qbtn"><span class="qbi">↗</span>Share</button>
            <button class="qbtn"><span class="qbi">⇄</span>Compare</button>
            <button class="qbtn" data-go="app-emi"><span class="qbi">🧮</span>EMI</button>
          </div>

          <div class="spec-grid mt16">
            <div class="spec"><div class="sv">${c.km}</div><div class="sl">Kilometers</div></div>
            <div class="spec"><div class="sv">${c.fuel}</div><div class="sl">Fuel</div></div>
            <div class="spec"><div class="sv">${c.trans}</div><div class="sl">Transmission</div></div>
            <div class="spec"><div class="sv">${c.year}</div><div class="sl">Reg. Year</div></div>
            <div class="spec"><div class="sv">${c.owner}</div><div class="sl">Ownership</div></div>
            <div class="spec"><div class="sv">₹${c.emi}</div><div class="sl">EMI / mo</div></div>
          </div>

          <div class="section-title mt24 mb12">Choose an option</div>
          <div class="opt-grid">
            <button class="opt" data-go="app-book"><span class="oi" style="background:var(--teal-050);color:var(--teal-600)">🚗</span><span><span class="ot">Book Test Drive</span><br><span class="os">Hub or doorstep (≤40 km)</span></span></button>
            <button class="opt" data-go="app-interest"><span class="oi" style="background:#eef2ff;color:#4f46e5">📞</span><span><span class="ot">Send Interest</span><br><span class="os">Get a callback</span></span></button>
            <button class="opt" data-go="app-emi"><span class="oi" style="background:var(--emerald-050);color:var(--emerald-500)">🧮</span><span><span class="ot">EMI Options</span><br><span class="os">Indicative · from ₹${c.emi}/mo</span></span></button>
          </div>

          <div class="section-title mt24 mb12">Key highlights</div>
          <div class="row gap8 wrap">${["Sunroof", "Ventilated seats", "360° camera", "6 airbags", "Apple CarPlay", "Cruise control"].map(h => chip(h, "outline")).join("")}</div>

          <div class="section-title mt24 mb12">Inspection Report</div>
          <div class="inspection-card">
            <div class="row gap12">
              <div class="score-ring" style="background:conic-gradient(var(--emerald-500) 0 ${c.score}%, var(--ink-200) ${c.score}% 100%)"><b>${c.score}</b></div>
              <div class="grow">
                <div style="font-weight:800;font-size:15px">Grade ${c.grade} · ${c.score}/100</div>
                <div class="tiny muted">200-point check by AssureCars · via Inspection App</div>
                <div class="badge-certified mt8">✔ Verified PDF available</div>
              </div>
            </div>
            <div class="mt12">
              ${reportRow("Engine & Transmission", "Excellent")}
              ${reportRow("Tyres (avg tread)", "72%", false)}
              ${reportRow("Accidental history", "None")}
              ${reportRow("Electricals & AC", "Excellent")}
            </div>
            <button class="btn btn-ghost btn-block btn-sm mt12">📄 View full inspection PDF</button>
          </div>

          <div class="callout info mt16"><span class="ci">🛈</span><div>This car is <b>unique inventory</b> (VIN ${"MA3EYD81S00" + c.id.slice(1)}12456). To buy, pay a token at the hub — the <b>Hub Admin</b> then reserves it for you and closes the deal offline.</div></div>

          <div class="section-title mt24 mb12">Similar cars</div>
        </div>
        <div class="hlist" style="padding-bottom:20px">${cars.filter(x => x.id !== c.id).slice(0, 3).map(carCard).join("")}</div>
      </div>
      <div class="sticky-cta">
        <div class="price"><span class="p">₹${c.price} L</span><span class="l">Fixed · no haggling</span></div>
        <button class="btn btn-ghost grow" data-go="app-interest">Send Interest</button>
        <button class="btn btn-primary grow" data-go="app-book">Book Test Drive</button>
      </div>
    </div>`;
  };

  const days = [["MON", "14"], ["TUE", "15"], ["WED", "16"], ["THU", "17"], ["FRI", "18"], ["SAT", "19"]];
  const slots = [
    ["09:00", "2 left", "low"], ["09:20", "3 left", "ok"], ["09:40", "Full", "no"],
    ["10:00", "3 left", "ok"], ["10:20", "1 left", "low"], ["10:40", "3 left", "ok"],
    ["11:00", "Full", "no"], ["11:20", "2 left", "low"], ["11:40", "3 left", "ok"]
  ];
  const appBook = () => {
    const c = carById(currentCarId);
    return `
    <div class="screen" id="app-book">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-detail">←</button><div><div style="font-weight:800;font-size:16px">Book Test Drive</div><div class="tiny muted">${c.name} · ${c.year}</div></div></div>
      <div class="app-body">
        <div class="pad">
          <div class="section-title mb12">1 · Choose mode</div>
          <div class="mode-toggle">
            <div class="mode on"><div class="mt">🏢 At Hub</div><div class="ms">${c.hub} · ${distOf(c)}</div></div>
            <div class="mode"><div class="mt">🚙 Doorstep</div><div class="ms">We bring the car (within 40 km)</div></div>
          </div>

          <div class="section-title mt24 mb12">2 · Pick a date</div>
          <div class="day-row">${days.map((d, i) => `<div class="day ${i === 2 ? "on" : ""}"><div class="dn">${d[0]}</div><div class="dd">${d[1]}</div></div>`).join("")}</div>

          <div class="section-title mt24 mb8">3 · Pick a time slot</div>
          <div class="callout amber mb12"><span class="ci">⚡</span><div><b>Concurrent slots:</b> a 20-min drive means the same car can be shown to several buyers back-to-back. Numbers show remaining capacity.</div></div>
          <div class="slot-grid">
            ${slots.map((s) => `<div class="slot ${s[2] === "no" ? "full" : ""} ${s[0] === "09:20" ? "on" : ""}"><div class="stime">${s[0]}</div><div class="sleft ${s[2]}">${s[1]}</div></div>`).join("")}
          </div>
        </div>
      </div>
      <div class="sticky-cta">
        <div class="price"><span class="p">Wed, 16 · 09:20</span><span class="l">At hub · ${c.hub}</span></div>
        <button class="btn btn-primary grow" data-go="app-book-success">Confirm Booking</button>
      </div>
    </div>`;
  };

  const appBookSuccess = () => {
    const c = carById(currentCarId);
    return `
    <div class="screen" id="app-book-success">
      ${statusbar()}
      <div class="success-wrap">
        <div class="success-check">✓</div>
        <div style="font-size:22px;font-weight:800">Test Drive Confirmed!</div>
        <div class="muted" style="max-width:280px">Your slot for <b>${c.name}</b> is booked. Show the OTP below when the agent arrives.</div>
        <div class="mt20" style="background:#fff;border:1px solid var(--ink-200);border-radius:16px;padding:18px;width:100%">
          <div class="row between mb12"><span class="tiny muted">Booking ID</span><b class="tiny">#TD-48213</b></div>
          <div class="row between"><div><div style="font-weight:800">Wed, 16 Jul · 9:20 AM</div><div class="tiny muted">${c.hub} · At Hub</div></div><span class="chip green">Confirmed</span></div>
          <div class="mt16 center"><div class="tiny muted mb8">Check-in OTP</div><div class="otp-box"><i>4</i><i>9</i><i>1</i><i>7</i></div></div>
        </div>
        <div class="callout info mt16" style="text-align:left"><span class="ci">🔔</span><div>We'll send reminders 24h and 2h before. Reschedule or cancel anytime — the freed slot opens up instantly for others.</div></div>
        <button class="btn btn-primary btn-block mt16" data-go="app-bookings">View My Drives</button>
        <button class="btn btn-ghost btn-block" data-go="app-home">Back to Home</button>
      </div>
    </div>`;
  };

  const appInterest = () => {
    const c = carById(currentCarId);
    return `
    <div class="screen" id="app-interest">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-detail">←</button><div><div style="font-weight:800;font-size:16px">Send Interest</div><div class="tiny muted">${c.name}</div></div></div>
      <div class="app-body"><div class="pad">
        <div class="callout info mb16"><span class="ci">📞</span><div>Our hub sales team will call you back — usually within <b>15 minutes</b>. Updates come via push, SMS & <b>WhatsApp</b>.</div></div>
        <div class="field"><label>Your name</label><input class="input" value="Aarav Mehta" /></div>
        <div class="field"><label>Mobile number</label><input class="input" value="+91 98450 12345" /></div>
        <div class="field"><label>I'm interested in</label>
          <div class="seg"><button class="on">Buying</button><button>Exchange</button><button>Finance info</button></div>
        </div>
        <div class="field"><label>Preferred contact time</label>
          <div class="seg"><button>Morning</button><button class="on">Afternoon</button><button>Evening</button></div>
        </div>
        <div class="field"><label>Message (optional)</label><textarea class="input" rows="3">Is the price negotiable? Also keen on a test drive this weekend.</textarea></div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-primary btn-block" data-go="app-interest-success">Submit Interest</button></div>
    </div>`;
  };

  const appInterestSuccess = () => `
    <div class="screen" id="app-interest-success">
      ${statusbar()}
      <div class="success-wrap">
        <div class="success-check">✓</div>
        <div style="font-size:22px;font-weight:800">We've got your interest!</div>
        <div class="muted" style="max-width:280px"><b>Rahul from AssureCars</b> will call you this afternoon. Lead <b>#LD-90271</b> created.</div>
        <div class="mt20" style="background:#fff;border:1px solid var(--ink-200);border-radius:16px;padding:18px;width:100%;text-align:left">
          <div class="row gap12"><div class="avatar-xs" style="width:42px;height:42px;font-size:15px">R</div><div><div style="font-weight:700">Rahul Sharma</div><div class="tiny muted">Hub Employee (Sales) · ${carById(currentCarId).hub}</div></div><span class="chip teal" style="margin-left:auto">Assigned</span></div>
        </div>
        <button class="btn btn-primary btn-block mt20" data-go="app-book">Book a Test Drive</button>
        <button class="btn btn-ghost btn-block" data-go="app-home">Back to Home</button>
      </div>
    </div>`;

  const appServices = () => `
    <div class="screen" id="app-services">
      ${statusbar()}
      <div class="app-topbar navy"><button class="icon-btn" data-go="app-home">←</button><div style="font-weight:800;font-size:17px">Inspection Services</div></div>
      <div class="app-body"><div class="pad">
        <div class="callout info mb16"><span class="ci">🔧</span><div>Powered by the AssureCars <b>Inspection App</b> — a certified technician inspects and delivers a detailed PDF report.</div></div>

        <div class="car-card" style="cursor:default"><div class="cc-body">
          <div class="row gap12"><div style="font-size:26px">💰</div><div class="grow"><div class="cc-name">Sell your car</div><div class="tiny muted">Get an inspection + offer from the dealer</div></div></div>
          <button class="btn btn-dark btn-block mt12" data-go="app-sell">Start Sell Request</button>
        </div></div>

        <div class="car-card mt16" style="cursor:default"><div class="cc-body">
          <div class="row gap12"><div style="font-size:26px">🔍</div><div class="grow"><div class="cc-name">PDI — Pre-Delivery Inspection</div><div class="tiny muted">Inspect a car you're buying elsewhere</div></div></div>
          <button class="btn btn-ghost btn-block mt12" data-go="app-pdi">Book PDI Check</button>
        </div></div>

        <button class="btn btn-ghost btn-block mt16" data-go="app-requests">📋 Track my Sell & PDI requests</button>
      </div></div>
      ${tabbar("")}
    </div>`;

  const appSell = () => `
    <div class="screen" id="app-sell">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-services">←</button><div style="font-weight:800;font-size:16px">Sell Request</div></div>
      <div class="app-body"><div class="pad">
        <div class="field"><label>Request type</label><div class="seg"><button class="on">Sell my car</button><button>PDI (buying elsewhere)</button></div></div>
        <div class="field"><label>Car make & model</label><input class="input" placeholder="e.g. Hyundai i20 Asta" value="Volkswagen Polo GT" /></div>
        <div class="field"><label>Registration number</label><input class="input" value="KA-05-MJ-7788" /></div>
        <div class="field"><label>Pincode / location</label><input class="input" value="560102 · HSR Layout, Bengaluru" /></div>
        <div class="field"><label>Preferred date</label><input class="input" value="Sat, 19 Jul" /></div>
        <div class="callout info"><span class="ci">📍</span><div>Your request is routed to your <b>nearest hub (within 40 km)</b>, which manages the inspection, offer and everything after. The assigned hub is shown once routed.</div></div>
        <div class="callout amber mt12"><span class="ci">📅</span><div>We'll schedule a technician using the same slot engine and send you the report PDF when ready.</div></div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-primary btn-block" data-go="app-interest-success">Submit Request</button></div>
    </div>`;

  const appBookings = () => `
    <div class="screen" id="app-bookings">
      ${statusbar()}
      <div class="app-topbar"><div style="font-weight:800;font-size:18px">My Test Drives</div><button class="icon-btn" style="margin-left:auto" data-go="app-home">✕</button></div>
      <div class="app-body"><div class="pad" style="display:flex;flex-direction:column;gap:14px">
        <div class="car-card" data-go="app-td-detail"><div class="cc-body">
          <div class="row between"><b>Toyota Fortuner</b><span class="chip green">Confirmed</span></div>
          <div class="tiny muted mt8">Wed, 16 Jul · 9:20 AM · Whitefield Hub</div>
          <div class="row gap8 mt12"><span class="chip">OTP 4917</span><span class="chip teal">At Hub</span><span class="chip amber">Track ›</span></div>
          <div class="row gap8 mt12"><button class="btn btn-ghost btn-sm grow" data-go="app-reschedule">Reschedule</button><button class="btn btn-ghost btn-sm grow">Cancel</button></div>
        </div></div>
        <div class="car-card" style="cursor:default;opacity:.75"><div class="cc-body">
          <div class="row between"><b>Honda City</b><span class="chip">Completed</span></div>
          <div class="tiny muted mt8">Sat, 12 Jul · 4:00 PM · Indiranagar Hub</div>
          <button class="btn btn-ghost btn-sm btn-block mt12">Rate your experience ★</button>
        </div></div>
      </div></div>
      ${tabbar("")}
    </div>`;

  const appAccount = () => `
    <div class="screen" id="app-account">
      ${statusbar()}
      <div class="app-topbar navy"><div style="font-weight:800;font-size:18px">Account</div><button class="icon-btn" style="margin-left:auto" data-go="app-home">✕</button></div>
      <div class="app-body"><div class="pad">
        <div class="row gap12" data-go="app-profile" style="cursor:pointer"><div class="avatar-xs" style="width:52px;height:52px;font-size:20px;background:var(--teal-600)">A</div><div class="grow"><div style="font-weight:800;font-size:17px">Aarav Mehta</div><div class="tiny muted">+91 98450 12345</div></div><span class="chip outline">Edit ›</span></div>
        <div class="mt20" style="display:flex;flex-direction:column;gap:2px">
          ${[["♡ Saved cars", "app-saved"], ["📅 My test drives", "app-bookings"], ["💰 Sell & PDI requests", "app-requests"], ["🔔 Notifications", "app-notifications"], ["⚙️ Settings", "app-settings"]].map(x => `<div class="report-row" style="padding:15px 0;cursor:pointer" data-go="${x[1]}">${x[0]}<span class="st muted">›</span></div>`).join("")}
        </div>
      </div></div>
      ${tabbar("")}
    </div>`;

  // ---- inner pages ----
  const appLogin = () => `
    <div class="screen" id="app-login">
      ${statusbar()}
      <div class="login-wrap">
        <div class="login-logo">◆</div>
        <h1 style="font-size:26px;margin-top:24px">Welcome to<br>AssureCars</h1>
        <p class="muted mt8">Certified pre-owned cars, inspected & assured. Log in to continue.</p>
        <div class="mt24">
          <div class="field"><label>Mobile number</label>
            <div class="row gap8"><div class="input" style="width:66px;text-align:center">+91</div><input class="input grow" value="98450 12345" /></div>
          </div>
        </div>
        <button class="btn btn-primary btn-block mt8" data-go="app-otp">Get OTP →</button>
        <div class="tiny muted center mt16">By continuing you agree to our Terms & Privacy Policy.</div>
        <div class="grow"></div>
        <button class="btn btn-ghost btn-block" data-go="app-home">Skip · Browse as guest</button>
      </div>
    </div>`;

  const appOtp = () => `
    <div class="screen" id="app-otp">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-login">←</button><div style="font-weight:800;font-size:16px">Verify OTP</div></div>
      <div class="login-wrap" style="padding-top:20px">
        <p class="muted">Enter the 4-digit code sent to <b style="color:var(--ink-900)">+91 98450 12345</b></p>
        <div class="otp-box mt20" style="justify-content:space-between"><i>4</i><i>9</i><i>1</i><i>7</i></div>
        <div class="row between mt16 tiny"><span class="muted">Resend in 0:24</span><span style="color:var(--teal-600);font-weight:700">Change number</span></div>
        <button class="btn btn-primary btn-block mt24" data-go="app-home">Verify & Continue</button>
        <div class="callout info mt16"><span class="ci">🔒</span><div>OTP is valid for 5 minutes. Access token 15m · refresh rotated on use.</div></div>
        <div class="grow"></div>
        <div class="keypad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(k => k === "" ? "<span></span>" : `<button>${k}</button>`).join("")}</div>
      </div>
    </div>`;

  const appFilters = () => `
    <div class="screen" id="app-filters">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-search">←</button><div style="font-weight:800;font-size:16px">Filters</div><span class="tiny" style="margin-left:auto;color:var(--teal-600);font-weight:700">Reset</span></div>
      <div class="app-body"><div class="pad">
        <div class="section-title mb12">Budget</div>
        <div class="row between tiny muted"><span>₹5L</span><span>₹50L+</span></div>
        <div style="height:6px;border-radius:6px;background:var(--ink-200);position:relative;margin:10px 0 4px"><div style="position:absolute;left:10%;right:35%;height:100%;background:var(--teal-500);border-radius:6px"></div><div style="position:absolute;left:10%;top:-5px;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid var(--teal-500)"></div><div style="position:absolute;left:63%;top:-5px;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid var(--teal-500)"></div></div>
        <div class="row between tiny mt8"><b>₹10.0 L</b><b>₹25.0 L</b></div>

        <div class="section-title mt24 mb12">Body type</div>
        <div class="pill-row wrap" style="flex-wrap:wrap;gap:8px">${["SUV", "Sedan", "Hatchback", "MUV", "Luxury"].map((b, i) => `<span class="chip ${i < 2 ? "navy" : "outline"}">${b}</span>`).join("")}</div>

        <div class="section-title mt24 mb12">Fuel</div>
        <div class="pill-row wrap" style="flex-wrap:wrap;gap:8px">${["Petrol", "Diesel", "Hybrid", "CNG", "Electric"].map((b, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}">${b}</span>`).join("")}</div>

        <div class="section-title mt24 mb12">Transmission</div>
        <div class="seg"><button class="on">Any</button><button>Automatic</button><button>Manual</button></div>

        <div class="section-title mt24 mb12">Ownership</div>
        <div class="seg"><button class="on">1st owner</button><button>Up to 2nd</button><button>Any</button></div>

        <div class="section-title mt24 mb12">Kilometers driven</div>
        <div class="pill-row wrap" style="flex-wrap:wrap;gap:8px">${["< 20k", "< 40k", "< 60k", "< 80k", "Any"].map((b, i) => `<span class="chip ${i === 1 ? "navy" : "outline"}">${b}</span>`).join("")}</div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-ghost grow" data-go="app-search">Clear</button><button class="btn btn-primary grow" data-go="app-search">Show ${cars.length} cars</button></div>
    </div>`;

  const appSaved = () => `
    <div class="screen" id="app-saved">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-account">←</button><div style="font-weight:800;font-size:18px">Saved Cars</div></div>
      <div class="app-body"><div class="pad" style="display:flex;flex-direction:column;gap:14px">
        ${[cars[0], cars[4]].map(carCard).join("")}
        <div class="callout info"><span class="ci">🔔</span><div>We'll alert you on <b>price drops</b> for saved cars, and if one is no longer available.</div></div>
      </div></div>
      ${tabbar("")}
    </div>`;

  const appNotifications = () => `
    <div class="screen" id="app-notifications">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-home">←</button><div style="font-weight:800;font-size:18px">Notifications</div><span class="tiny" style="margin-left:auto;color:var(--teal-600);font-weight:700">Mark all read</span></div>
      <div class="app-body">
        ${[["📅", "Test drive confirmed", "Toyota Fortuner · Wed 16 Jul, 9:20 AM at Whitefield Hub", "2m", true],
           ["💬", "WhatsApp: Rahul will call you", "Your interest in Honda City has been assigned to our hub sales team", "1h", true],
           ["⏰", "Reminder: test drive tomorrow", "Bring a valid driving licence. OTP: 4917", "5h", false],
           ["🔻", "Price drop on a saved car", "Kia Seltos is now ₹15.25 L (was ₹15.90 L)", "1d", false],
           ["🔒", "Car reserved for you", "Whitefield Hub reserved Hyundai Creta for you after your token", "1d", false]].map(n => `
          <div class="lead-item" style="align-items:flex-start;${n[4] ? "background:var(--teal-050)" : ""}">
            <div class="score" style="background:var(--ink-100);color:var(--ink-700);font-size:18px">${n[0]}</div>
            <div class="li-body"><div class="n">${n[1]}</div><div class="s" style="white-space:normal">${n[2]}</div></div>
            <span class="tiny muted">${n[3]}</span>
          </div>`).join("")}
      </div>
      ${tabbar("")}
    </div>`;

  const appTdDetail = () => `
    <div class="screen" id="app-td-detail">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-bookings">←</button><div><div style="font-weight:800;font-size:16px">Test Drive Details</div><div class="tiny muted">#TD-48213</div></div><span class="chip amber" style="margin-left:auto">Agent en route</span></div>
      <div class="app-body"><div class="pad">
        <div class="map-mock">
          <div class="map-pin start"><span>🏢</span></div>
          <div class="map-car">🚙</div>
          <div class="map-pin end"><span>📍</span></div>
        </div>
        <div class="eta-band mt16"><div style="font-size:26px">🚙</div><div class="grow"><div class="tiny" style="color:var(--ink-300)">Arriving in</div><div class="big">12 min</div></div><a class="chip teal">📞 Call driver</a></div>

        <div class="car-card mt16" style="cursor:default"><div class="cc-body">
          <div class="row gap12"><div class="car-img g1" style="width:70px;height:52px;border-radius:10px">${carSVG()}</div><div><b>Toyota Fortuner</b><div class="tiny muted">2022 · Doorstep · HSR Layout</div></div></div>
        </div></div>

        <div class="section-title mt20 mb12">Your check-in OTP</div>
        <div class="center mb8"><div class="otp-box"><i>4</i><i>9</i><i>1</i><i>7</i></div></div>
        <div class="tiny muted center mb16">Share this with the agent to start the drive</div>

        <div class="section-title mb12">Status</div>
        <div class="timeline-mini">
          <div class="tm-item done"><div class="tm-t">Booking confirmed</div><div class="tm-s">Yesterday, 6:40 PM</div></div>
          <div class="tm-item done"><div class="tm-t">Reminders sent</div><div class="tm-s">T-24h & T-2h</div></div>
          <div class="tm-item active"><div class="tm-t">Agent en route</div><div class="tm-s">Rahul · Now · 12 min away</div></div>
          <div class="tm-item"><div class="tm-t">Check-in (OTP)</div><div class="tm-s">Pending</div></div>
          <div class="tm-item"><div class="tm-t">Drive & feedback</div><div class="tm-s">Pending</div></div>
        </div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-ghost grow" data-go="app-reschedule">Reschedule</button><button class="btn btn-primary grow" data-go="app-bookings">Cancel drive</button></div>
    </div>`;

  const appReschedule = () => `
    <div class="screen" id="app-reschedule">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-td-detail">←</button><div style="font-weight:800;font-size:16px">Reschedule Drive</div></div>
      <div class="app-body"><div class="pad">
        <div class="callout amber mb16"><span class="ci">↔</span><div>Moving your slot frees your current seat instantly — it becomes bookable for other buyers.</div></div>
        <div class="section-title mb12">New date</div>
        <div class="day-row">${days.map((d, i) => `<div class="day ${i === 4 ? "on" : ""}"><div class="dn">${d[0]}</div><div class="dd">${d[1]}</div></div>`).join("")}</div>
        <div class="section-title mt24 mb12">New time slot</div>
        <div class="slot-grid">${slots.map((s) => `<div class="slot ${s[2] === "no" ? "full" : ""} ${s[0] === "10:00" ? "on" : ""}"><div class="stime">${s[0]}</div><div class="sleft ${s[2]}">${s[1]}</div></div>`).join("")}</div>
      </div></div>
      <div class="sticky-cta"><div class="price"><span class="p">Fri, 18 · 10:00</span><span class="l">Whitefield Hub</span></div><button class="btn btn-primary grow" data-go="app-book-success">Confirm New Slot</button></div>
    </div>`;

  const appRequests = () => `
    <div class="screen" id="app-requests">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-account">←</button><div style="font-weight:800;font-size:18px">Sell & PDI Requests</div></div>
      <div class="pad-x mt8"><div class="pill-row">${["All", "Sell", "PDI"].map((p, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}">${p}</span>`).join("")}</div></div>
      <div class="app-body" style="padding-top:12px"><div class="pad" style="display:flex;flex-direction:column;gap:14px">
        <div class="car-card" style="cursor:default"><div class="cc-body">
          <div class="row between"><div><b>Sell · VW Polo GT</b><div class="tiny muted mt8">#IR-771 · KA-05-MJ-7788</div></div><span class="chip teal">Report Ready</span></div>
          <div class="tiny muted mt8">📍 Assigned hub · Koramangala Hub, Bengaluru (within 40 km)</div>
          <div class="timeline-mini mt12">
            <div class="tm-item done"><div class="tm-t">Requested</div></div>
            <div class="tm-item done"><div class="tm-t">Inspection scheduled · Sat 19 Jul</div></div>
            <div class="tm-item done"><div class="tm-t">Inspected (Inspection App)</div></div>
            <div class="tm-item active"><div class="tm-t">Report ready · offer ₹6.8 L</div></div>
          </div>
          <div class="row gap8 mt8"><button class="btn btn-ghost btn-sm grow">📄 View report</button><button class="btn btn-primary btn-sm grow">Accept offer</button></div>
        </div></div>
        <div class="car-card" style="cursor:default"><div class="cc-body">
          <div class="row between"><div><b>PDI · Maruti Swift (new)</b><div class="tiny muted mt8">#IR-802 · buying from another showroom</div></div><span class="chip amber">Scheduled</span></div>
          <div class="tiny muted mt12">📍 Assigned hub · Whitefield Hub, Bengaluru · Inspection on Sun, 20 Jul · report delivered as PDF</div>
        </div></div>
      </div></div>
      ${tabbar("")}
    </div>`;

  const appPdi = () => `
    <div class="screen" id="app-pdi">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-services">←</button><div style="font-weight:800;font-size:16px">PDI Request</div></div>
      <div class="app-body"><div class="pad">
        <div class="callout info mb16"><span class="ci">🔍</span><div>Get a car you're buying <b>elsewhere</b> inspected. We deliver a detailed PDF — the car doesn't enter our inventory.</div></div>
        <div class="field"><label>What are you buying?</label><div class="seg"><button class="on">New car</button><button>Used (another dealer)</button></div></div>
        <div class="field"><label>Car make & model</label><input class="input" value="Maruti Swift ZXi+" /></div>
        <div class="field"><label>Showroom / seller pincode & location</label><input class="input" value="560066 · Nexa, Whitefield" /></div>
        <div class="field"><label>Registration no. (if used)</label><input class="input" placeholder="Optional for new cars" /></div>
        <div class="field"><label>Preferred inspection date</label><input class="input" value="Sun, 20 Jul" /></div>
        <div class="callout info mt8"><span class="ci">📍</span><div>We route your PDI to the <b>nearest hub</b> — its technician inspects the car and sends you the PDF.</div></div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-primary btn-block" data-go="app-interest-success">Submit PDI Request</button></div>
    </div>`;

  const appProfile = () => `
    <div class="screen" id="app-profile">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-account">←</button><div style="font-weight:800;font-size:16px">Edit Profile</div></div>
      <div class="app-body"><div class="pad">
        <div class="center mb20"><div class="avatar-xs" style="width:74px;height:74px;font-size:28px;margin:0 auto;background:var(--teal-600)">A</div><div class="tiny mt8" style="color:var(--teal-600);font-weight:700">Change photo</div></div>
        <div class="field"><label>Full name</label><input class="input" value="Aarav Mehta" /></div>
        <div class="field"><label>Mobile (verified)</label><input class="input" value="+91 98450 12345" disabled style="background:var(--ink-050)" /></div>
        <div class="field"><label>Email</label><input class="input" value="aarav.mehta@email.com" /></div>
        <div class="field"><label>City</label><select><option>Bengaluru</option><option>Chennai</option><option>Hyderabad</option></select></div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-primary btn-block" data-go="app-account">Save changes</button></div>
    </div>`;

  const appSettings = () => `
    <div class="screen" id="app-settings">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-account">←</button><div style="font-weight:800;font-size:16px">Settings</div></div>
      <div class="app-body"><div class="pad">
        <div class="section-title mb8">Notifications</div>
        ${[["Push notifications", true], ["SMS alerts", true], ["Email updates", false], ["WhatsApp updates", false], ["Price-drop alerts", true]].map(s => `<div class="cfg-row" style="padding:13px 0"><div class="cfg-label"><b style="font-size:14px">${s[0]}</b></div><div class="toggle ${s[1] ? "on" : ""}"></div></div>`).join("")}
        <div class="section-title mt20 mb8">Preferences</div>
        ${["Language · English", "Quiet hours · 10 PM – 8 AM", "Privacy & data", "Help & support"].map(x => `<div class="report-row" style="padding:15px 0">${x}<span class="st muted">›</span></div>`).join("")}
        <button class="btn btn-ghost btn-block mt20" data-go="app-login" style="color:var(--rose-500);border-color:var(--rose-050)">Sign out</button>
      </div></div>
      ${tabbar("")}
    </div>`;

  const appEmi = () => {
    const c = carById(currentCarId);
    return `
    <div class="screen" id="app-emi">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="app-detail">←</button><div><div style="font-weight:800;font-size:16px">EMI Calculator</div><div class="tiny muted">${c.name}</div></div></div>
      <div class="app-body"><div class="pad">
        <div class="emi-card center">
          <div class="tiny muted">Estimated monthly EMI <span class="chip outline" style="font-size:10px">Indicative</span></div>
          <div class="emi-big" style="color:var(--teal-600)">₹${c.emi}</div>
          <div class="tiny muted">for 60 months @ 9.5% p.a. · display only, no financing</div>
        </div>
        <div class="field mt20"><label>Loan amount</label><input class="input" value="₹${(c.price * 0.8).toFixed(1)} L" /></div>
        <div class="field"><label>Down payment</label>
          <div style="height:6px;border-radius:6px;background:var(--ink-200);position:relative;margin:12px 0 4px"><div style="position:absolute;left:0;width:20%;height:100%;background:var(--teal-500);border-radius:6px"></div><div style="position:absolute;left:20%;top:-5px;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid var(--teal-500)"></div></div>
          <div class="row between tiny mt8"><span class="muted">₹${(c.price * 0.2).toFixed(1)} L (20%)</span></div>
        </div>
        <div class="field"><label>Tenure</label><div class="seg"><button>36m</button><button>48m</button><button class="on">60m</button><button>72m</button></div></div>

        <div class="section-title mt16 mb8">On-road price breakup</div>
        <div class="price-break">
          <div class="pb-row"><span>Ex-showroom (listed)</span><span>₹${c.price} L</span></div>
          <div class="pb-row"><span>RTO & registration</span><span>₹0.62 L</span></div>
          <div class="pb-row"><span>Insurance (1 yr)</span><span>₹0.48 L</span></div>
          <div class="pb-row"><span>On-road price</span><span>₹${(parseFloat(c.price) + 1.1).toFixed(2)} L</span></div>
        </div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-ghost grow" data-go="app-interest">Talk to advisor</button><button class="btn btn-primary grow" data-go="app-book">Book Test Drive</button></div>
    </div>`;
  };

  const buildApp = () => `
    <div class="frame-wrap">
      <div class="frame-label"><span class="dot"></span> End-User Mobile App · Flutter (Android / iOS)</div>
      <div class="phone"><div class="notch"></div><div class="phone-screen" id="frame-app">
        ${appHome()}${appSearch()}${appDetail()}${appBook()}${appBookSuccess()}
        ${appInterest()}${appInterestSuccess()}
        ${appServices()}${appSell()}${appBookings()}${appAccount()}
        ${appLogin()}${appOtp()}${appFilters()}${appSaved()}${appNotifications()}
        ${appTdDetail()}${appReschedule()}${appRequests()}${appPdi()}${appProfile()}${appSettings()}${appEmi()}
      </div></div>
    </div>`;

  // ============================ WEBSITE ============================
  const webNav = (active) => `
    <div class="web-nav">
      <div class="brand2" data-go="web-home"><span class="logo">◆</span> AssureCars</div>
      <a data-go="web-listing" style="${active === "buy" ? "color:var(--teal-600)" : ""}">Buy Car</a>
      <a data-go="web-sell">Sell Car</a>
      <a data-go="web-certified">Certified Program</a>
      <a data-go="web-pdi">PDI Service</a>
      <span class="spacer"></span>
      <a>📍 Bengaluru</a>
      <button class="btn btn-ghost btn-sm" data-go="web-signin">Sign in</button>
      <button class="btn btn-dark btn-sm" data-go="web-listing">Browse cars</button>
    </div>`;

  const webFooter = () => `
      <div class="web-footer">
        <div><div class="brand2" style="color:#fff;margin-bottom:12px"><span class="logo">◆</span> AssureCars</div><p style="max-width:300px">A self-hosted platform that powers a dealer's entire pre-owned car business online.</p></div>
        <div><h5>Company</h5><a data-go="web-certified">Certified Program</a><a>Hubs</a><a>Careers</a></div>
        <div><h5>Services</h5><a data-go="web-listing">Buy</a><a data-go="web-sell">Sell</a><a data-go="web-pdi">PDI Check</a></div>
        <div><h5>Support</h5><a>Contact</a><a data-go="web-pdi">FAQs</a><a>Terms</a></div>
      </div>`;

  const webHome = () => `
    <div class="screen active web" id="web-home">
      ${webNav("home")}
      <div class="web-hero">
        <h1>Premium certified used cars, without the guesswork.</h1>
        <p>Every AssureCars vehicle is inspected on 200 points and comes with a shareable report. Book a doorstep test drive in seconds.</p>
        <div class="web-searchbox">
          <select><option>Any Make</option><option>Toyota</option><option>Hyundai</option><option>Kia</option></select>
          <select><option>Any Budget</option><option>Under ₹15L</option><option>₹15L–25L</option><option>₹25L+</option></select>
          <select><option>Body Type</option><option>SUV</option><option>Sedan</option></select>
          <button class="btn btn-primary" data-go="web-listing">🔍 Search 240+ cars</button>
        </div>
        <div class="web-stats">
          <div class="s"><div class="n">200-pt</div><div class="l">Inspection on every car</div></div>
          <div class="s"><div class="n">Doorstep</div><div class="l">Test drives at your home</div></div>
          <div class="s"><div class="n">Zero</div><div class="l">Hidden charges</div></div>
        </div>
      </div>
      <div class="web-section">
        <div class="row between"><div><h2>Featured cars</h2><p class="muted">Handpicked, certified, ready to drive.</p></div><button class="btn btn-ghost" data-go="web-listing">View all →</button></div>
        <div class="web-grid cars">${cars.slice(0, 3).map(c => carCard(c).replace('data-go="app-detail"', 'data-go="web-detail"')).join("")}</div>
      </div>
      <div class="web-section" style="background:var(--ink-050)">
        <h2 class="center">How AssureCars works</h2>
        <div class="web-grid" style="grid-template-columns:repeat(4,1fr);margin-top:30px">
          ${[["🔍", "Browse & filter", "Search certified inventory with real photos, specs and hub location."], ["📄", "Check the report", "See the full 200-point inspection PDF before you commit."], ["🚙", "Test drive", "At a hub or doorstep (within 40 km) — pick a slot that suits you."], ["🤝", "Close the deal", "Pay a token at the hub; the Hub Admin reserves it and completes the sale offline."]].map(x => `<div style="background:#fff;border:1px solid var(--ink-200);border-radius:16px;padding:22px"><div style="font-size:30px">${x[0]}</div><div style="font-weight:700;margin:10px 0 6px">${x[1]}</div><div class="tiny muted">${x[2]}</div></div>`).join("")}
        </div>
      </div>
      <div class="web-cta-band">
        <div class="grow"><h2>Want to sell your car?</h2><p style="color:var(--ink-200);margin-top:6px">Get a free inspection and a fair offer. We handle the paperwork.</p></div>
        <button class="btn" style="background:#fff;color:var(--navy-900)" data-go="web-sell">Get a quote →</button>
      </div>
      <div class="web-footer">
        <div><div class="brand2" style="color:#fff;margin-bottom:12px"><span class="logo">◆</span> AssureCars</div><p style="max-width:300px">A self-hosted platform that powers a dealer's entire pre-owned car business online.</p></div>
        <div><h5>Company</h5><a>About</a><a>Hubs</a><a>Careers</a></div>
        <div><h5>Services</h5><a>Buy</a><a>Sell</a><a>PDI Check</a></div>
        <div><h5>Support</h5><a>Contact</a><a>FAQs</a><a>Terms</a></div>
      </div>
    </div>`;

  const webListing = () => `
    <div class="screen web" id="web-listing">
      ${webNav("buy")}
      <div class="breadcrumb"><a data-go="web-home">Home</a> › Used Cars in Bengaluru</div>
      <div class="web-listing">
        <aside class="filter-panel">
          <div class="row between mb12"><b>Filters</b><span class="tiny" style="color:var(--teal-600)">Clear all</span></div>
          <div class="filter-group"><h4>Budget</h4>
            <div class="check on"><i></i> Under ₹15 Lakh</div><div class="check"><i></i> ₹15L – ₹25L</div><div class="check"><i></i> Above ₹25L</div></div>
          <div class="filter-group"><h4>Body type</h4>
            <div class="check on"><i></i> SUV</div><div class="check"><i></i> Sedan</div><div class="check"><i></i> Hatchback</div></div>
          <div class="filter-group"><h4>Fuel</h4>
            <div class="check"><i></i> Petrol</div><div class="check"><i></i> Diesel</div><div class="check on"><i></i> Hybrid</div></div>
          <div class="filter-group"><h4>Transmission</h4>
            <div class="check on"><i></i> Automatic</div><div class="check"><i></i> Manual</div></div>
        </aside>
        <div>
          <div class="web-listing-head"><div><h2 style="font-size:22px">Used cars in Bengaluru</h2><span class="tiny muted">${cars.length} certified cars found</span></div>
            <select style="padding:10px 14px;border:1px solid var(--ink-200);border-radius:10px"><option>Relevance</option><option>Price: Low to High</option><option>Newest first</option><option>Lowest km</option></select></div>
          <div class="web-grid cars" style="grid-template-columns:repeat(2,1fr)">${cars.map(c => carCard(c).replace('data-go="app-detail"', 'data-go="web-detail"')).join("")}</div>
        </div>
      </div>
    </div>`;

  const webDetail = () => {
    const c = carById(currentCarId);
    return `
    <div class="screen web" id="web-detail">
      ${webNav("buy")}
      <div class="breadcrumb"><a data-go="web-home">Home</a> › <a data-go="web-listing">Used Cars</a> › ${c.name}</div>
      <div class="web-detail">
        <div>
          <div class="car-img ${c.grad} gallery-main">${carSVG()}<div class="imgtag">${chip("✔ Certified", "green")}</div></div>
          <div class="gallery-thumbs">${["g1", "g2", "g3", "g5"].map(g => `<div class="car-img ${g}">${carSVG()}</div>`).join("")}</div>

          <div class="panel mt24" style="border-radius:16px">
            <div class="panel-head"><h3>200-Point Inspection Report</h3><span class="badge-certified" style="margin-left:auto">Grade ${c.grade} · ${c.score}/100</span></div>
            <div class="panel-body">
              <div class="web-grid" style="grid-template-columns:repeat(3,1fr);gap:14px">
                ${[["Engine", "Excellent"], ["Transmission", "Excellent"], ["Suspension", "Good"], ["Brakes", "Excellent"], ["Tyres", "72% avg"], ["Electricals", "Excellent"], ["Exterior", "Minor marks"], ["Interior", "Excellent"], ["Accidental", "None"]].map(x => `<div style="background:var(--ink-050);border-radius:10px;padding:12px"><div class="tiny muted">${x[0]}</div><div style="font-weight:700;margin-top:3px">🟢 ${x[1]}</div></div>`).join("")}
              </div>
              <button class="btn btn-ghost mt16">📄 Download full inspection PDF</button>
            </div>
          </div>
        </div>
        <div>
          <div style="position:sticky;top:88px">
            <div class="row between"><h1 style="font-size:28px">${c.name}</h1><span class="chip teal">Grade ${c.grade}</span></div>
            <p class="muted mt8">${c.year} · ${c.variant} · ${c.color}</p>
            <div class="row gap8 mt12 wrap">${chip(c.km + " km")}${chip(c.fuel)}${chip(c.trans)}${chip(c.owner + " owner")}</div>
            <div class="mt20" style="font-size:34px;font-weight:800">₹${c.price} Lakh</div>
            <div class="tiny muted">Fixed price · EMI from ₹${c.emi}/mo</div>
            <div class="row gap12 mt20"><button class="btn btn-primary grow" data-go="web-book">Book Test Drive</button><button class="btn btn-ghost grow" data-go="web-signin">Send Interest</button></div>
            <div class="callout info mt12" style="text-align:left"><span class="ci">🤝</span><div>To buy, pay a token at the hub — the <b>Hub Admin</b> reserves the car for you and closes the deal offline.</div></div>
            <div class="quick-row mt12">
              <button class="qbtn"><span class="qbi">♡</span>Save</button>
              <button class="qbtn"><span class="qbi">↗</span>Share</button>
              <button class="qbtn"><span class="qbi">⇄</span>Compare</button>
              <button class="qbtn" data-go="web-signin"><span class="qbi">🧮</span>EMI</button>
            </div>
            <div class="emi-card mt16">
              <div class="row between"><div><div class="tiny muted">EMI from</div><div class="emi-big" style="color:var(--teal-600)">₹${c.emi}<span style="font-size:13px;color:var(--ink-500)">/mo</span></div></div><button class="btn btn-ghost btn-sm" data-go="web-signin">Calculate</button></div>
              <div class="tiny muted mt8">60 months · 9.5% · 20% down</div>
            </div>
            <div class="panel mt16" style="border-radius:14px"><div class="panel-body">
              <div class="row gap12"><div style="font-size:22px">📍</div><div><b>${c.hub}</b><div class="tiny muted">${areaOf(c)} · ${distOf(c)} away · doorstep within 40 km</div></div></div>
            </div></div>
          </div>
        </div>
      </div>
      <div class="web-section" style="padding-top:0">
        <div class="row between"><h2 style="font-size:22px">Key highlights</h2></div>
        <div class="row gap8 wrap mt12">${["Sunroof", "Ventilated seats", "360° camera", "6 airbags", "Apple CarPlay", "Cruise control", "Wireless charging", "LED headlamps"].map(h => chip(h, "outline")).join("")}</div>
        <h2 style="font-size:22px;margin-top:34px">Similar cars</h2>
        <div class="web-grid cars" style="grid-template-columns:repeat(3,1fr)">${cars.filter(x => x.id !== c.id).slice(0, 3).map(x => carCard(x).replace('data-go="app-detail"', 'data-go="web-detail"')).join("")}</div>
      </div>
      ${webFooter()}
    </div>`;
  };

  const webSell = () => `
    <div class="screen web" id="web-sell">
      ${webNav("")}
      <div class="web-page-hero">
        <div class="web-narrow">
          <span class="chip teal">Sell your car</span>
          <h1 class="mt12">Sell your car at a fair price, hassle-free.</h1>
          <p>Free doorstep inspection by our certified technician, an instant offer, and paperwork handled for you.</p>
        </div>
      </div>
      <div class="web-section web-narrow">
        <div class="web-grid" style="grid-template-columns:1.2fr 1fr;gap:34px;margin-top:0">
          <div>
            <h2>Get your instant quote</h2>
            <p class="muted mb20">Tell us about your car — takes 60 seconds.</p>
            <div class="form-grid">
              <div class="field"><label>Brand</label><select><option>Hyundai</option><option>Maruti</option><option>Toyota</option></select></div>
              <div class="field"><label>Model</label><select><option>i20</option><option>Creta</option><option>Verna</option></select></div>
              <div class="field"><label>Year</label><select><option>2021</option><option>2022</option><option>2023</option></select></div>
              <div class="field"><label>Fuel</label><select><option>Petrol</option><option>Diesel</option></select></div>
              <div class="field"><label>KM driven</label><input class="input" value="32,000" /></div>
              <div class="field"><label>Pincode / location</label><input class="input" value="560102" /></div>
              <div class="field full"><label>Your mobile number</label><input class="input" value="+91 98450 12345" /></div>
            </div>
            <div class="callout info mt12"><span class="ci">📍</span><div>We route your request to the <b>nearest hub (within 40 km)</b> based on your location — that hub's team schedules the inspection and makes the offer.</div></div>
            <button class="btn btn-primary mt8" data-go="web-listing">Get instant quote →</button>
          </div>
          <div>
            <div class="panel" style="border-radius:16px"><div class="panel-body">
              <div class="tiny muted">Estimated offer</div>
              <div style="font-size:32px;font-weight:800;margin:6px 0">₹6.6 – 7.1 L</div>
              <div class="tiny muted">Final price confirmed after free inspection.</div>
            </div></div>
            <div class="mt20 timeline-mini">
              <div class="tm-item done"><div class="tm-t">Share car details</div><div class="tm-s">Instant indicative quote</div></div>
              <div class="tm-item done"><div class="tm-t">Free inspection</div><div class="tm-s">At home or nearest hub</div></div>
              <div class="tm-item active"><div class="tm-t">Final offer + paperwork</div><div class="tm-s">RC transfer handled</div></div>
              <div class="tm-item"><div class="tm-t">Get paid</div><div class="tm-s">Settled offline, quickly</div></div>
            </div>
          </div>
        </div>
      </div>
      ${webFooter()}
    </div>`;

  const webPdi = () => `
    <div class="screen web" id="web-pdi">
      ${webNav("")}
      <div class="web-page-hero">
        <div class="web-narrow"><span class="chip teal">PDI service</span>
          <h1 class="mt12">Buying a car elsewhere? Inspect it first.</h1>
          <p>Our technician inspects any new or used car you're about to buy and hands you a detailed 200-point PDF report.</p>
          <button class="btn btn-primary mt20" data-go="web-signin">Book a PDI · ₹1,499</button>
        </div>
      </div>
      <div class="web-section web-narrow">
        <h2 class="center mb20">How PDI works</h2>
        <div class="steps-row">
          ${[["Book online", "Tell us the car & location."], ["We inspect", "200-point check by a certified technician."], ["Get the PDF", "Detailed report with photos & grade."], ["Buy with confidence", "Negotiate armed with facts."]].map((s, i) => `<div class="step-card"><div class="num">${i + 1}</div><div style="font-weight:700;margin-bottom:6px">${s[0]}</div><div class="tiny muted">${s[1]}</div></div>`).join("")}
        </div>
        <h2 class="mt24 mb16" style="font-size:22px">FAQs</h2>
        ${[["Which location do you inspect from?", "We route your request to your nearest hub automatically — just give the car's pincode/location."], ["Does the car enter your inventory?", "No. A PDI car is third-party — you just receive the report."], ["New cars too?", "Yes — pre-delivery inspections for brand-new cars are supported."], ["How fast is the report?", "Usually within a few hours of inspection, delivered as a PDF."]].map(f => `<div class="faq-item"><div class="q">${f[0]}<span class="muted">＋</span></div><div class="a">${f[1]}</div></div>`).join("")}
      </div>
      ${webFooter()}
    </div>`;

  const webCertified = () => `
    <div class="screen web" id="web-certified">
      ${webNav("")}
      <div class="web-page-hero"><div class="web-narrow"><span class="chip green">Certified program</span>
        <h1 class="mt12">Every car passes 200 checkpoints.</h1>
        <p>What "Certified by AssureCars" really means — no accidental history, verified odometer, and a shareable inspection report.</p>
      </div></div>
      <div class="web-section web-narrow">
        <div class="web-grid" style="grid-template-columns:repeat(3,1fr);margin-top:0">
          ${[["🔧", "Engine & Transmission", "40+ checks on performance, leaks, and health."], ["🛞", "Tyres & Suspension", "Tread depth, alignment, shocks & brakes."], ["⚡", "Electricals & AC", "Battery, lights, infotainment, cooling."], ["🚗", "Exterior & Body", "Panel-by-panel paint & dent mapping."], ["🪑", "Interior", "Upholstery, seats, controls, odour."], ["📋", "Documents", "RC, insurance, odometer, ownership."]].map(x => `<div class="step-card"><div style="font-size:28px">${x[0]}</div><div style="font-weight:700;margin:10px 0 6px">${x[1]}</div><div class="tiny muted">${x[2]}</div></div>`).join("")}
        </div>
        <div class="web-cta-band" style="margin:34px 0 0"><div class="grow"><h2>See a sample report</h2><p style="color:var(--ink-200);margin-top:6px">Full transparency, before you commit.</p></div><button class="btn" style="background:#fff;color:var(--navy-900)" data-go="web-listing">Browse certified cars →</button></div>
      </div>
      ${webFooter()}
    </div>`;

  const webSignin = () => `
    <div class="screen web" id="web-signin">
      ${webNav("")}
      <div class="signin-wrap">
        <div class="signin-card">
          <div class="brand2" style="justify-content:center;margin-bottom:8px"><span class="logo">◆</span> AssureCars</div>
          <h2 class="center" style="font-size:22px">Sign in to continue</h2>
          <p class="muted center tiny mb20">We'll send a one-time password to your phone.</p>
          <div class="field"><label>Mobile number</label><div class="row gap8"><div class="input" style="width:60px;text-align:center">+91</div><input class="input grow" value="98450 12345" /></div></div>
          <button class="btn btn-primary btn-block mt8" data-go="web-home">Send OTP</button>
          <div class="tiny muted center mt16">New here? An account is created automatically.</div>
        </div>
      </div>
    </div>`;

  const webBook = () => {
    const c = carById(currentCarId);
    return `
    <div class="screen web" id="web-book">
      ${webNav("buy")}
      <div class="breadcrumb"><a data-go="web-home">Home</a> › <a data-go="web-detail">${c.name}</a> › Book test drive</div>
      <div class="web-section web-narrow" style="padding-top:20px">
        <div class="web-grid" style="grid-template-columns:1.3fr 1fr;gap:34px;margin-top:0">
          <div>
            <h2>Book a test drive</h2>
            <p class="muted mb20">${c.name} · ${c.year} · ${c.hub} · ${areaOf(c)}</p>
            <div class="mode-toggle" style="max-width:420px"><div class="mode on"><div class="mt">🏢 At Hub</div><div class="ms">${c.hub} · ${distOf(c)}</div></div><div class="mode"><div class="mt">🚙 Doorstep</div><div class="ms">We bring the car (within 40 km)</div></div></div>
            <div class="section-title mt24 mb12">Pick a date</div>
            <div class="day-row">${days.map((d, i) => `<div class="day ${i === 2 ? "on" : ""}"><div class="dn">${d[0]}</div><div class="dd">${d[1]}</div></div>`).join("")}</div>
            <div class="section-title mt24 mb8">Pick a time slot</div>
            <div class="callout amber mb12" style="max-width:520px"><span class="ci">⚡</span><div>Numbers show remaining <b>concurrent capacity</b> — short back-to-back drives on the same car.</div></div>
            <div class="slot-grid" style="max-width:520px;grid-template-columns:repeat(4,1fr)">${slots.map((s) => `<div class="slot ${s[2] === "no" ? "full" : ""} ${s[0] === "09:20" ? "on" : ""}"><div class="stime">${s[0]}</div><div class="sleft ${s[2]}">${s[1]}</div></div>`).join("")}</div>
          </div>
          <div>
            <div class="panel" style="border-radius:16px;position:sticky;top:88px"><div class="panel-body">
              <div class="car-img ${c.grad}" style="height:120px;border-radius:12px">${carSVG()}</div>
              <div class="row between mt12"><b>${c.name}</b><span class="chip teal">Grade ${c.grade}</span></div>
              <div class="tiny muted mt8">Wed, 16 Jul · 09:20 · At Hub</div>
              <div class="field mt16"><label>Your name</label><input class="input" value="Aarav Mehta" /></div>
              <div class="field"><label>Mobile</label><input class="input" value="+91 98450 12345" /></div>
              <button class="btn btn-primary btn-block" data-go="web-home">Confirm booking</button>
            </div></div>
          </div>
        </div>
      </div>
      ${webFooter()}
    </div>`;
  };

  const buildWeb = () => `
    <div class="frame-wrap">
      <div class="frame-label"><span class="dot"></span> Customer Website · Angular (SSR / SEO)</div>
      <div class="desktop">
        <div class="browser-bar"><span class="dots"><i></i><i></i><i></i></span><div class="url"><span class="lock">🔒</span> www.premiumcars-bengaluru.com</div></div>
        <div class="desktop-screen" id="frame-web">
          ${webHome()}${webListing()}${webDetail()}
          ${webSell()}${webPdi()}${webCertified()}${webSignin()}${webBook()}
        </div>
      </div>
    </div>`;

  // ============================ ADMIN PANEL ============================
  const adminSidebar = (active) => `
    <aside class="admin-side">
      <div class="brand3"><span class="logo">◆</span> AssureCars</div>
      <div class="nav-group">
        <div class="gl">Overview</div>
        <div class="nav-item ${active === "dash" ? "active" : ""}" data-go="admin-dash"><span class="ni">📊</span> Dashboard</div>
        <div class="nav-item ${active === "reports" ? "active" : ""}" data-go="admin-reports"><span class="ni">📈</span> Reports & Analytics</div>
      </div>
      <div class="nav-group">
        <div class="gl">Inventory</div>
        <div class="nav-item ${active === "inv" ? "active" : ""}" data-go="admin-inventory"><span class="ni">🚗</span> Cars & Catalog</div>
        <div class="nav-item ${active === "consignors" ? "active" : ""}" data-go="admin-consignors"><span class="ni">🏷️</span> Consignors</div>
        <div class="nav-item ${active === "insp" ? "active" : ""}" data-go="admin-inspections"><span class="ni">📄</span> Inspections</div>
      </div>
      <div class="nav-group">
        <div class="gl">Operations</div>
        <div class="nav-item ${active === "leads" ? "active" : ""}" data-go="admin-leads"><span class="ni">🎯</span> Leads / CRM</div>
        <div class="nav-item ${active === "td" ? "active" : ""}" data-go="admin-td"><span class="ni">📅</span> Test-Drive Config</div>
        <div class="nav-item ${active === "res" ? "active" : ""}" data-go="admin-res"><span class="ni">🔒</span> Reserved Vehicles</div>
        <div class="nav-item ${active === "hubs" ? "active" : ""}" data-go="admin-hubs"><span class="ni">🏢</span> Hubs & Staff</div>
      </div>
      <div class="nav-group">
        <div class="gl">Settings</div>
        <div class="nav-item ${active === "users" ? "active" : ""}" data-go="admin-users"><span class="ni">👥</span> Users & RBAC</div>
        <div class="nav-item ${active === "branding" ? "active" : ""}" data-go="admin-branding"><span class="ni">🎨</span> Branding</div>
        <div class="nav-item ${active === "flags" ? "active" : ""}" data-go="admin-flags"><span class="ni">🚩</span> Feature Flags</div>
      </div>
      <div class="side-foot"><div class="av">PA</div><div><div style="color:#fff;font-size:13px;font-weight:700">Priya Anand</div><div class="tiny">Super Admin · All hubs</div></div></div>
    </aside>`;

  const adminTop = (title) => `
    <div class="admin-top"><h1>${title}</h1><div class="search2">🔍 Search cars, leads, VIN…</div><span class="chip navy" style="margin-left:auto">Super Admin · All hubs</span><button class="btn btn-primary btn-sm" data-go="admin-carform">+ Add Car</button></div>`;

  const adminDash = () => `
    <div class="screen active" id="admin-dash" style="position:relative">
      <div class="admin">${adminSidebar("dash")}
        <div class="admin-main">${adminTop("Dashboard")}
          <div class="admin-content">
            <div class="kpi-grid">
              ${[["Live Inventory", "142", "+8 this week", "up", "🚗", "var(--teal-050)", "var(--teal-600)"],
                 ["Open Leads", "68", "+12% vs last wk", "up", "🎯", "#eef2ff", "#4f46e5"],
                 ["Test Drives Today", "23", "5 doorstep", "up", "📅", "var(--amber-050)", "#b9770e"],
                 ["Active Reservations", "9", "2 expiring soon", "down", "🔒", "var(--emerald-050)", "var(--emerald-500)"]].map(k => `
                <div class="kpi"><div class="row"><div class="kt">${k[0]}</div><div class="kico" style="background:${k[5]};color:${k[6]}">${k[4]}</div></div><div class="kv">${k[1]}</div><div class="kd ${k[3]}">${k[3] === "up" ? "▲" : "▼"} ${k[2]}</div></div>`).join("")}
            </div>

            <div class="two-col">
              <div class="panel">
                <div class="panel-head"><h3>Demand funnel — this month</h3><span class="chip" style="margin-left:auto">Interest → Sold</span></div>
                <div class="panel-body">
                  ${[["Interest / Leads", 420, "var(--teal-500)"], ["Contacted", 356, "var(--teal-500)"], ["Test Drive Scheduled", 214, "#4f46e5"], ["Test Drive Completed", 178, "#4f46e5"], ["Reserved", 96, "var(--amber-500)"], ["Sold (closed offline)", 61, "var(--emerald-500)"]].map(f => `
                    <div class="mb16"><div class="row between tiny mb8"><b>${f[0]}</b><span class="muted">${f[1]}</span></div><div style="height:10px;border-radius:6px;background:var(--ink-100);overflow:hidden"><div style="height:100%;width:${(f[1] / 420 * 100).toFixed(0)}%;background:${f[2]};border-radius:6px"></div></div></div>`).join("")}
                </div>
              </div>
              <div class="panel">
                <div class="panel-head"><h3>Today's ops board</h3></div>
                <div class="panel-body">
                  ${[["Slot fill rate", "78%", "green"], ["No-shows", "2", "rose"], ["Unmatched inspections", "1", "amber"], ["Leads breaching SLA", "3", "rose"], ["Cars pending publish", "5", "amber"]].map(o => `<div class="cfg-row" style="padding:12px 0"><div class="cfg-label"><b style="font-size:13.5px">${o[0]}</b></div><span class="chip ${o[2]}">${o[1]}</span></div>`).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const srcChip = (s) => s === "Owned" ? chip("Owned", "teal") : s === "ConsignedVendor" ? chip("Consigned · Vendor", "amber") : chip("Consigned · Individual", "amber");
  const statusChip = (s) => {
    const map = { Live: "green", Reserved: "amber", Certified: "teal", InInspection: "outline", Draft: "outline", Sold: "navy" };
    return `<span class="status-dot" style="color:${{ green: "var(--emerald-500)", amber: "var(--amber-500)", teal: "var(--teal-600)", navy: "var(--ink-500)", outline: "var(--ink-400)" }[map[s]]}">${s}</span>`;
  };
  const invRows = [
    { c: cars[0], st: "Live" }, { c: cars[1], st: "Reserved" }, { c: cars[2], st: "Live" },
    { c: cars[3], st: "Certified" }, { c: cars[4], st: "Live" }, { c: cars[5], st: "InInspection" }
  ];
  const adminInventory = () => `
    <div class="screen" id="admin-inventory">
      <div class="admin">${adminSidebar("inv")}
        <div class="admin-main">${adminTop("Cars & Catalog")}
          <div class="admin-content">
            <div class="row between mb16" style="align-items:flex-end;gap:12px">
              <div class="pill-row">${["All (142)", "Live (128)", "Reserved (9)", "Certified (3)", "In Inspection (5)", "Draft (7)"].map((p, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}">${p}</span>`).join("")}</div>
              <div class="field" style="margin:0;min-width:200px"><label>Filter by hub</label><select><option>All hubs</option><option>Whitefield Hub</option><option>Indiranagar Hub</option><option>Koramangala Hub</option></select></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>Inventory</h3><div class="ph-right"><button class="btn btn-ghost btn-sm">⇪ Bulk import</button><button class="btn btn-primary btn-sm" data-go="admin-carform">+ Add Car</button></div></div>
              <table class="tbl">
                <thead><tr><th>Vehicle</th><th>VIN</th><th>Hub</th><th>Source</th><th>Inspection</th><th>Price</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  ${invRows.map((r) => `<tr>
                    <td><div class="car-mini"><div class="car-img ${r.c.grad} thumb">${carSVG()}</div><div><b>${r.c.name}</b><div class="tiny muted">${r.c.year} · ${r.c.km} km</div></div></div></td>
                    <td class="tiny">MA3EYD…${r.c.id.slice(1)}456</td>
                    <td class="tiny">${r.c.hub}</td>
                    <td>${srcChip(r.c.source)}</td>
                    <td>${r.st === "InInspection" ? chip("Pending", "outline") : chip("✔ " + r.c.grade + " · " + r.c.score, "green")}</td>
                    <td><b>₹${r.c.price}L</b></td>
                    <td>${statusChip(r.st)}</td>
                    <td><button class="btn btn-ghost btn-sm" data-go="admin-carform">Edit</button></td>
                  </tr>`).join("")}
                </tbody>
              </table>
            </div>
            <div class="callout info"><span class="ci">🏢</span><div><b>Hub scoping:</b> Super Admin sees & edits cars across <b>all hubs</b>; a Hub Admin sees only cars in <b>their assigned hub(s)</b>. Hub Employees can't edit the catalog.</div></div>
            <div class="callout amber"><span class="ci">🔒</span><div><b>Publish gate:</b> a car cannot go <b>Live</b> for any source (Owned or Consigned) without a passing ingested inspection report + a set price.</div></div>
          </div>
        </div>
      </div>
    </div>`;

  const adminTd = () => `
    <div class="screen" id="admin-td">
      <div class="admin">${adminSidebar("td")}
        <div class="admin-main">${adminTop("Test-Drive Configuration")}
          <div class="admin-content">
            <div class="two-col">
              <div class="panel">
                <div class="panel-head"><h3>Slot Template · Whitefield Hub</h3><span class="chip teal" style="margin-left:auto">Concurrent-slot engine</span></div>
                <div class="panel-body">
                  <div class="cfg-row"><div class="cfg-label"><b>Operating hours</b><span>Days the hub takes test drives</span></div><div class="row gap8"><input class="input" style="width:80px;padding:8px" value="09:00"><span>–</span><input class="input" style="width:80px;padding:8px" value="19:00"></div></div>
                  <div class="cfg-row"><div class="cfg-label"><b>Test-drive duration</b><span>Length of each drive</span></div><div class="stepper"><button data-step="-1" data-target="dur">−</button><span class="val" id="dur">20</span><button data-step="1" data-target="dur">+</button></div></div>
                  <div class="cfg-row"><div class="cfg-label"><b>Capacity per slot</b><span>Concurrent / back-to-back drives allowed</span></div><div class="stepper"><button data-step="-1" data-target="cap" data-cap>−</button><span class="val" id="cap">3</span><button data-step="1" data-target="cap" data-cap>+</button></div></div>
                  <div class="cfg-row"><div class="cfg-label"><b>Buffer between drives</b><span>Cleanup / handover time</span></div><div class="stepper"><button data-step="-1" data-target="buf">−</button><span class="val" id="buf">0</span><button data-step="1" data-target="buf">+</button></div></div>
                  <div class="cfg-row"><div class="cfg-label"><b>Doorstep test drives</b><span>Allow drivers to bring cars to buyers</span></div><div class="toggle on"></div></div>
                  <div class="cfg-row"><div class="cfg-label"><b>Rolling horizon</b><span>Days of slots generated ahead</span></div><div class="stepper"><button data-step="-1" data-target="hor">−</button><span class="val" id="hor">14</span><button data-step="1" data-target="hor">+</button></div></div>
                  <div class="row gap8 mt16"><button class="btn btn-primary">Save & regenerate slots</button><button class="btn btn-ghost">Add blackout date</button></div>
                </div>
              </div>
              <div>
                <div class="capacity-preview">
                  <div class="row between"><b>Live preview</b><span class="chip teal">Cap <span id="capEcho">3</span>/slot</span></div>
                  <div class="tiny" style="color:var(--ink-400);margin-top:6px">A 60-min window with 20-min drives → 3 back-to-back bookings on the same car.</div>
                  <div class="cap-slots" id="capSlots"></div>
                </div>
                <div class="callout info mt16"><span class="ci">⚡</span><div>Capacity = min(car availability, hub bays, available agents). Redis counter + DB conditional update guarantee no over-booking.</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const kanbanData = {
    New: [["Aarav Mehta", "Toyota Fortuner", 92], ["Divya R.", "Kia Seltos", 74]],
    Contacted: [["Sameer K.", "Honda City", 81], ["Neha Gupta", "Creta", 88]],
    Qualified: [["Rohit V.", "XUV700", 95]],
    "Test Drive": [["Aisha N.", "Grand Vitara", 90], ["Karan M.", "Seltos", 68]],
    Negotiation: [["Vikram S.", "Fortuner", 97]]
  };
  const scoreColor = (s) => s >= 90 ? "background:var(--emerald-050);color:var(--emerald-500)" : s >= 75 ? "background:var(--amber-050);color:#b9770e" : "background:var(--ink-100);color:var(--ink-500)";
  const adminLeads = () => `
    <div class="screen" id="admin-leads">
      <div class="admin">${adminSidebar("leads")}
        <div class="admin-main">${adminTop("Leads / CRM")}
          <div class="admin-content">
            <div class="row between mb16"><div class="pill-row">${["All executives", "Rahul S.", "Meena T.", "Unassigned"].map((p, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}">${p}</span>`).join("")}</div><button class="btn btn-ghost btn-sm">Assignment rules ⚙</button></div>
            <div class="kanban">
              ${Object.entries(kanbanData).map(([col, items]) => `
                <div class="kcol"><div class="kh">${col}<span class="cnt">${items.length}</span></div>
                  ${items.map(it => `<div class="kcard" data-go="admin-leaddetail" style="cursor:pointer"><div class="kn">${it[0]}</div><div class="ks">Interested in ${it[1]}</div><div class="kf"><span class="chip" style="${scoreColor(it[2])};font-size:11px">Score ${it[2]}</span><div class="avatar-xs">${it[0][0]}</div></div></div>`).join("")}
                </div>`).join("")}
            </div>
            <div class="callout info mt20"><span class="ci">⏱</span><div><b>SLA auto-escalation:</b> unattended leads are reassigned by a scheduled job. Duplicate interest on the same car merges into the open lead.</div></div>
          </div>
        </div>
      </div>
    </div>`;

  const adminRes = () => `
    <div class="screen" id="admin-res">
      <div class="admin">${adminSidebar("res")}
        <div class="admin-main">${adminTop("Reserved Vehicles (Non-Financial · Hub Admin)")}
          <div class="admin-content">
            <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
              ${[["Active reservations", "9", "🔒", "held for a specific buyer"], ["Overdue (> 15 days)", "1", "🟠", "auto-release pending"], ["Sold this month", "61", "🟢", "closed offline"]].map(k => `<div class="kpi"><div class="kt">${k[2]} ${k[0]}</div><div class="kv">${k[1]}</div><div class="tiny muted">${k[3]}</div></div>`).join("")}
            </div>
            <div class="panel">
              <div class="panel-head"><h3>Reserved vehicles</h3><button class="btn btn-primary btn-sm" style="margin-left:auto" data-go="admin-reserveform">+ Reserve a car</button></div>
              <table class="tbl">
                <thead><tr><th>Car</th><th>Reserved for</th><th>Token</th><th>Days pending</th><th>Status</th><th>Follow-up</th><th>Action</th></tr></thead>
                <tbody>
                  ${[[cars[1], "Neha Gupta", "₹25,000 ✔", "3 / 15", "Reserved", "amber", "Rahul S."],
                     [cars[0], "Vikram S. (Lead #LD-90188)", "₹50,000 ✔", "6 / 15", "DealInProgress", "teal", "Meena T."],
                     [cars[4], "Karan M.", "₹25,000 ✔", "16 / 15", "Overdue", "rose", "—"]].map(r => `
                    <tr>
                      <td><div class="car-mini"><div class="car-img ${r[0].grad} thumb">${carSVG()}</div><div><b>${r[0].name}</b><div class="tiny muted">${r[0].hub}</div></div></div></td>
                      <td>${r[1]}</td><td class="tiny">${r[2]}</td>
                      <td><b class="${r[4] === "Overdue" ? "" : ""}" style="color:${r[4] === "Overdue" ? "var(--rose-500)" : "var(--ink-900)"}">${r[3]}</b></td>
                      <td>${chip(r[4], r[5])}</td>
                      <td class="tiny">${r[6] === "—" ? '<button class="btn btn-ghost btn-sm">Notify Employee App</button>' : `Notified ${r[6]}`}</td>
                      <td><div class="row gap6"><button class="btn btn-primary btn-sm">Mark Sold</button><button class="btn btn-ghost btn-sm">Release</button></div></td>
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>
            <div class="callout info"><span class="ci">🛈</span><div><b>Hub Admin only.</b> A car is reserved after an <b>offline token</b> (recorded for reference — no payment/ledger). A reserved car is <b>fully locked</b> (no interest / test drive / second reservation). If not marked <b>Sold</b> within the configurable hold (<b>default 15 days</b>), it auto-releases back to <b>Live</b>. Use <b>Notify Employee App</b> to have the assigned Hub Employee follow up on the final deal.</div></div>
          </div>
        </div>
      </div>
    </div>`;

  const adminReserveForm = () => {
    const c = cars[0];
    return `
    <div class="screen" id="admin-reserveform">
      <div class="admin">${adminSidebar("res")}
        <div class="admin-main">
          <div class="admin-top"><button class="btn btn-ghost btn-sm" data-go="admin-res">← Back</button><h1 style="font-size:17px">Reserve a car</h1><span class="chip navy" style="margin-left:16px">Hub Admin</span></div>
          <div class="admin-content"><div class="two-col">
            <div class="panel"><div class="panel-head"><h3>Reservation details</h3></div><div class="panel-body">
              <div class="field"><label>Car (Live only)</label><select><option>Toyota Fortuner · Whitefield Hub · ₹38.75 L</option><option>Honda City · Indiranagar Hub · ₹14.90 L</option></select></div>
              <div class="field"><label>Buyer</label><div class="seg"><button class="on">Link a lead</button><button>Enter manually</button></div></div>
              <div class="field"><label>Lead / enquiry</label><select><option>Vikram Singh · #LD-90188 · Fortuner</option><option>Neha Gupta · #LD-90205 · Creta</option></select></div>
              <div class="form-grid">
                <div class="field"><label>Buyer name (if manual)</label><input class="input" placeholder="e.g. Karan Malhotra" /></div>
                <div class="field"><label>Buyer phone (if manual)</label><input class="input" placeholder="+91 …" /></div>
              </div>
              <div class="cfg-row"><div class="cfg-label"><b>Token received (offline)</b><span>Reference only — no payment is taken here</span></div><div class="toggle on"></div></div>
              <div class="field"><label>Token amount (reference)</label><input class="input" value="₹25,000" /></div>
              <div class="field"><label>Hold period</label><select><option>15 days (default)</option><option>7 days</option><option>30 days</option></select></div>
              <div class="row gap8 mt8"><button class="btn btn-primary btn-sm" data-go="admin-res">Reserve car</button><button class="btn btn-ghost btn-sm" data-go="admin-res">Cancel</button></div>
            </div></div>
            <div class="panel"><div class="panel-head"><h3>What happens next</h3></div><div class="panel-body">
              <div class="timeline-mini">
                <div class="tm-item done"><div class="tm-t">Car → Reserved & locked</div><div class="tm-s">Removed from search; interest/test-drive disabled</div></div>
                <div class="tm-item active"><div class="tm-t">Hold runs for 15 days</div><div class="tm-s">Shown on the Reserved Vehicles screen with days-pending</div></div>
                <div class="tm-item"><div class="tm-t">Notify Employee App</div><div class="tm-s">Assigned Hub Employee follows up on the final deal</div></div>
                <div class="tm-item"><div class="tm-t">Mark Sold / auto-release</div><div class="tm-s">Sold closes offline; else auto-releases to Live at day 15</div></div>
              </div>
              <div class="callout info mt12"><span class="ci">🛈</span><div>Buyer is identified by a <b>linked lead</b> or a <b>manual name + phone</b>. All money stays offline.</div></div>
            </div></div>
          </div></div>
        </div>
      </div>
    </div>`;
  };

  const adminCarForm = () => `
    <div class="screen" id="admin-carform">
      <div class="admin">${adminSidebar("inv")}
        <div class="admin-main">
          <div class="admin-top"><button class="btn btn-ghost btn-sm" data-go="admin-inventory">← Back</button><h1 style="font-size:17px">Add / Edit Car</h1><div style="margin-left:auto" class="row gap8"><button class="btn btn-ghost btn-sm">Save draft</button><button class="btn btn-primary btn-sm">Publish → Live</button></div></div>
          <div class="admin-content">
            <div class="two-col">
              <div class="panel"><div class="panel-head"><h3>Vehicle details</h3></div><div class="panel-body">
                <div class="field"><label>Listing source</label><div class="seg"><button class="on">Owned</button><button>Consigned · Vendor</button><button>Consigned · Individual</button></div></div>
                <div class="form-grid">
                  <div class="field"><label>Make</label><select><option>Toyota</option><option>Hyundai</option></select></div>
                  <div class="field"><label>Model</label><select><option>Fortuner</option><option>Creta</option></select></div>
                  <div class="field"><label>Variant</label><input class="input" value="2.8 4x4 AT Legender" /></div>
                  <div class="field"><label>Reg. year</label><input class="input" value="2022" /></div>
                  <div class="field full"><label>VIN (unique)</label><input class="input" value="MA3EYD81S00123456" /></div>
                  <div class="field"><label>Odometer (km)</label><input class="input" value="38400" /></div>
                  <div class="field"><label>Fuel</label><select><option>Diesel</option><option>Petrol</option></select></div>
                  <div class="field"><label>Transmission</label><select><option>Automatic</option><option>Manual</option></select></div>
                  <div class="field"><label>Ownership</label><select><option>1st</option><option>2nd</option></select></div>
                  <div class="field"><label>List price (₹)</label><input class="input" value="38,75,000" /></div>
                  <div class="field"><label>Hub</label><select><option>Whitefield Hub</option><option>Indiranagar Hub</option></select></div>
                </div>
                <div class="field"><label>Photos</label><div class="upload-box">⬆ Drag photos here or click to upload · min 6 images</div></div>
              </div></div>
              <div>
                <div class="panel"><div class="panel-head"><h3>Publish gate</h3></div><div class="panel-body">
                  <div class="gate-check"><span class="g ok">✓</span> VIN is unique</div>
                  <div class="gate-check"><span class="g ok">✓</span> Passing inspection report ingested (Grade A · 96)</div>
                  <div class="gate-check"><span class="g ok">✓</span> List price set</div>
                  <div class="gate-check"><span class="g no">!</span> Minimum 6 photos (4 uploaded)</div>
                  <div class="callout amber mt12"><span class="ci">🔒</span><div>Mandatory for <b>all</b> sourcing — no car goes Live without a passing report + price.</div></div>
                </div></div>
                <div class="panel"><div class="panel-head"><h3>Consignor</h3><span class="chip outline" style="margin-left:auto">Owned · not required</span></div><div class="panel-body">
                  <div class="field"><label>Link consignor (same hub only)</label><select><option>— Select a consignor in Whitefield Hub —</option><option>Sharma Motors (Vendor · 5.00%)</option><option>R. Iyer (Individual · 6.50%)</option></select></div>
                  <div class="tiny muted">Only consignors onboarded for the car's <b>selected hub</b> appear here. The car inherits the consignor's agreed <b>commission %</b> for reference — <b>no payout calculation or settlement</b>.</div>
                </div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const adminConsignors = () => `
    <div class="screen" id="admin-consignors">
      <div class="admin">${adminSidebar("consignors")}
        <div class="admin-main">${adminTop("Consignors")}
          <div class="admin-content">
            <div class="callout info mb16"><span class="ci">🏷️</span><div>Consignors own cars listed on commission. Each consignor is onboarded <b>for one hub</b> by that hub's admin (or the Super Admin). AssureCars records contact details <b>and the agreed commission %</b> for ops/reference — it does <b>not</b> compute payouts or settle commissions (offline).</div></div>
            <div class="panel mb16">
              <div class="panel-head"><h3>Onboard consignor</h3></div>
              <div class="panel-body">
                <div class="form-grid">
                  <div class="field"><label>Hub</label><select><option>Whitefield Hub</option><option>Indiranagar Hub</option><option>Koramangala Hub</option></select></div>
                  <div class="field"><label>Type</label><div class="seg"><button class="on">Vendor</button><button>Individual</button></div></div>
                  <div class="field"><label>Name</label><input class="input" placeholder="e.g. Speed Motors" /></div>
                  <div class="field"><label>Contact number</label><input class="input" placeholder="+91 …" /></div>
                  <div class="field"><label>Company <span class="tiny muted">(vendor)</span></label><input class="input" placeholder="e.g. Speed Motors LLP" /></div>
                  <div class="field"><label>Commission %</label><input class="input" type="number" min="0" max="100" step="0.5" placeholder="e.g. 5" /></div>
                </div>
                <div class="tiny muted mt8">Consignor is bound to the selected hub; a consigned car must belong to the same hub. Commission % is the agreed rate for <b>both Vendor and Individual</b> consignors — recorded for reference only.</div>
                <div class="row gap8 mt12"><button class="btn btn-primary btn-sm">Save consignor</button><button class="btn btn-ghost btn-sm">Cancel</button></div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>Consignor records</h3><button class="btn btn-primary btn-sm" style="margin-left:auto">+ Add Consignor</button></div>
              <table class="tbl"><thead><tr><th>Name</th><th>Hub</th><th>Type</th><th>Contact</th><th>Company</th><th>Commission</th><th>Cars listed</th><th></th></tr></thead><tbody>
                ${[["Speed Motors", "Whitefield Hub", "Vendor", "+91 90000 11111", "Speed Motors LLP", "5.0%", "6"], ["Ramesh Kumar", "Indiranagar Hub", "Individual", "+91 98111 22222", "—", "4.5%", "1"], ["Auto Bazaar", "Koramangala Hub", "Vendor", "+91 93333 44444", "Auto Bazaar Pvt", "6.0%", "3"]].map(r => `<tr><td><b>${r[0]}</b></td><td class="tiny">${r[1]}</td><td>${r[2] === "Vendor" ? chip("Vendor", "amber") : chip("Individual", "teal")}</td><td class="tiny">${r[3]}</td><td>${r[4]}</td><td><b>${r[5]}</b></td><td>${r[6]}</td><td><button class="btn btn-ghost btn-sm">Edit</button></td></tr>`).join("")}
              </tbody></table>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const adminInspections = () => `
    <div class="screen" id="admin-inspections">
      <div class="admin">${adminSidebar("insp")}
        <div class="admin-main">${adminTop("Inspections")}
          <div class="admin-content">
            <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
              ${[["Reports ingested (30d)", "48", "🟢", "via webhook (push)"], ["Unmatched", "1", "🟠", "awaiting car / manual link"], ["Ingestion mode", "Push", "⚡", "webhook · HMAC signed"]].map(k => `<div class="kpi"><div class="kt">${k[2]} ${k[0]}</div><div class="kv">${k[1]}</div><div class="tiny muted">${k[3]}</div></div>`).join("")}
            </div>
            <div class="panel">
              <div class="panel-head"><h3>Recent inspection reports</h3><span class="chip teal" style="margin-left:auto">From Inspection App</span></div>
              <table class="tbl"><thead><tr><th>External ID</th><th>Context</th><th>VIN / Request</th><th>Score</th><th>Status</th><th></th></tr></thead><tbody>
                ${[["INS-2026-0091234", "Inventory", "MA3EYD…123456", "95.5 · A", "Linked", "green"],
                   ["INS-2026-0091240", "Sell", "IR-771", "78.0 · B", "Linked", "green"],
                   ["INS-2026-0091255", "PDI", "IR-802", "—", "Scheduled", "amber"],
                   ["INS-2026-0091261", "Inventory", "VIN unknown", "88.0 · B+", "Unmatched", "rose"]].map(r => `<tr><td class="tiny"><b>${r[0]}</b></td><td>${chip(r[1], r[1] === "Inventory" ? "teal" : "outline")}</td><td class="tiny">${r[2]}</td><td>${r[3]}</td><td>${chip(r[4], r[5])}</td><td>${r[4] === "Unmatched" ? '<button class="btn btn-primary btn-sm">Resolve</button>' : '<button class="btn btn-ghost btn-sm">View PDF</button>'}</td></tr>`).join("")}
              </tbody></table>
            </div>
            <div class="callout amber"><span class="ci">🔗</span><div><b>Unmatched queue:</b> reports with no matching VIN are parked here and auto-linked when the car is created, or linked manually.</div></div>
          </div>
        </div>
      </div>
    </div>`;

  const adminHubs = () => `
    <div class="screen" id="admin-hubs">
      <div class="admin">${adminSidebar("hubs")}
        <div class="admin-main">${adminTop("Hubs & Staff")}
          <div class="admin-content">
            <div class="two-col">
              <div class="panel"><div class="panel-head"><h3>Hubs</h3><button class="btn btn-primary btn-sm" style="margin-left:auto">+ Add Hub</button></div>
                <table class="tbl"><thead><tr><th>Hub</th><th>Bays</th><th>Staff</th><th>Cars</th><th>Doorstep zones</th></tr></thead><tbody>
                  ${[["Whitefield Hub", "3", "8", "62", "5"], ["Indiranagar Hub", "2", "5", "41", "4"], ["Koramangala Hub", "2", "4", "39", "3"]].map(r => `<tr><td class="car-mini"><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join("")}
                </tbody></table>
              </div>
              <div class="panel"><div class="panel-head"><h3>Staff on shift</h3></div><div class="panel-body">
                ${[["Rahul Sharma", "Hub Employee · Sales", "Whitefield", "av"], ["Meena T.", "Hub Employee · Sales", "Indiranagar", "av"], ["Arjun P.", "Hub Employee · Test-Drive Agent", "Whitefield", "av"], ["Sana K.", "Hub Admin", "Koramangala", "av"]].map(s => `<div class="cfg-row" style="padding:12px 0"><div class="avatar-xs">${s[0][0]}</div><div class="cfg-label"><b style="font-size:13.5px">${s[0]}</b><span>${s[1]} · ${s[2]}</span></div><span class="status-dot" style="color:var(--emerald-500)">Online</span></div>`).join("")}
              </div></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const adminLeadDetail = () => `
    <div class="screen" id="admin-leaddetail">
      <div class="admin">${adminSidebar("leads")}
        <div class="admin-main">
          <div class="admin-top"><button class="btn btn-ghost btn-sm" data-go="admin-leads">← Back</button><h1 style="font-size:17px">Lead · Vikram S.</h1><span class="chip amber" style="margin-left:16px">Negotiation</span><div style="margin-left:auto" class="row gap8"><button class="btn btn-ghost btn-sm">Reassign</button><button class="btn btn-primary btn-sm">Log call</button></div></div>
          <div class="admin-content"><div class="two-col">
            <div class="panel"><div class="panel-head"><h3>Activity timeline</h3></div><div class="panel-body"><div class="timeline-mini">
              <div class="tm-item done"><div class="tm-t">Lead created · Interest on Toyota Fortuner</div><div class="tm-s">Website · 14 Jul, 10:12</div></div>
              <div class="tm-item done"><div class="tm-t">Auto-assigned to Rahul S.</div><div class="tm-s">Round-robin · 14 Jul, 10:12</div></div>
              <div class="tm-item done"><div class="tm-t">Called — interested, wants test drive</div><div class="tm-s">14 Jul, 10:40</div></div>
              <div class="tm-item done"><div class="tm-t">Test drive completed · rated warm</div><div class="tm-s">16 Jul, 09:40</div></div>
              <div class="tm-item active"><div class="tm-t">Negotiation · discussing price</div><div class="tm-s">Now</div></div>
            </div>
            <div class="field mt16"><label>Add note</label><textarea class="input" rows="2" placeholder="Log disposition / next action…"></textarea></div>
            </div></div>
            <div>
              <div class="panel"><div class="panel-head"><h3>Lead</h3><span class="chip green" style="margin-left:auto">Score 97</span></div><div class="panel-body">
                <div class="cfg-row" style="padding:9px 0"><div class="cfg-label"><span>Buyer</span><b>Vikram Singh</b></div></div>
                <div class="cfg-row" style="padding:9px 0"><div class="cfg-label"><span>Phone</span><b>+91 98220 33445</b></div></div>
                <div class="cfg-row" style="padding:9px 0"><div class="cfg-label"><span>Car</span><b>Toyota Fortuner</b></div></div>
                <div class="cfg-row" style="padding:9px 0"><div class="cfg-label"><span>Assigned</span><b>Rahul S.</b></div></div>
              </div></div>
              <button class="btn btn-primary btn-block" data-go="admin-reserveform">Reserve car for this lead →</button>
            </div>
          </div></div>
        </div>
      </div>
    </div>`;

  const adminReports = () => `
    <div class="screen" id="admin-reports">
      <div class="admin">${adminSidebar("reports")}
        <div class="admin-main">${adminTop("Reports & Analytics")}
          <div class="admin-content">
            <div class="pill-row mb16">${["Last 30 days", "This quarter", "Custom range"].map((p, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}">${p}</span>`).join("")}</div>
            <div class="kpi-grid">
              ${[["Test drives", "512", "+14%", "up", "📅", "var(--teal-050)", "var(--teal-600)"], ["TD → Reserve", "31%", "+3pts", "up", "🔄", "#eef2ff", "#4f46e5"], ["Slot fill rate", "78%", "+6pts", "up", "📊", "var(--amber-050)", "#b9770e"], ["Avg inventory age", "22 days", "-4d", "up", "⏱", "var(--emerald-050)", "var(--emerald-500)"]].map(k => `<div class="kpi"><div class="row"><div class="kt">${k[0]}</div><div class="kico" style="background:${k[5]};color:${k[6]}">${k[4]}</div></div><div class="kv">${k[1]}</div><div class="kd ${k[3]}">▲ ${k[2]}</div></div>`).join("")}
            </div>
            <div class="two-col">
              <div class="panel"><div class="panel-head"><h3>Test drives per hub</h3></div><div class="panel-body">
                ${[["Whitefield", 220], ["Indiranagar", 172], ["Koramangala", 120]].map(h => `<div class="mb16"><div class="row between tiny mb8"><b>${h[0]}</b><span class="muted">${h[1]}</span></div><div style="height:10px;border-radius:6px;background:var(--ink-100)"><div style="height:100%;width:${h[1] / 220 * 100}%;background:var(--teal-500);border-radius:6px"></div></div></div>`).join("")}
              </div></div>
              <div class="panel"><div class="panel-head"><h3>Staff conversion</h3></div><div class="panel-body">
                <table class="tbl"><thead><tr><th>Executive</th><th>Leads</th><th>Won</th><th>Rate</th></tr></thead><tbody>
                ${[["Rahul S.", 84, 26, "31%"], ["Meena T.", 71, 19, "27%"], ["Ravi N.", 60, 14, "23%"]].map(s => `<tr><td><b>${s[0]}</b></td><td>${s[1]}</td><td>${s[2]}</td><td>${chip(s[3], "green")}</td></tr>`).join("")}
                </tbody></table>
              </div></div>
            </div>
            <div class="callout info"><span class="ci">📈</span><div>MVP dashboards read from the primary DB. Advanced BI (DWH) and revenue reports are a later upgrade.</div></div>
          </div>
        </div>
      </div>
    </div>`;

  const adminUsers = () => `
    <div class="screen" id="admin-users">
      <div class="admin">${adminSidebar("users")}
        <div class="admin-main">${adminTop("Users & RBAC")}
          <div class="admin-content">
            <div class="callout info mb16"><span class="ci">🔐</span><div><b>Role hierarchy:</b> Super Admin (all hubs, dashboard-only) onboards Hubs, Hub Admins & Hub Employees. Hub Admin (dashboard-only, their hub) onboards Hub Employees & consignors. Hub Employees use the Employee App + Inspection App. Admin logins never open the Employee/Inspection apps.</div></div>
            <div class="panel"><div class="panel-head"><h3>Staff accounts</h3><button class="btn btn-primary btn-sm" style="margin-left:auto">+ Invite user</button></div>
              <table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Hub(s)</th><th>Clients</th><th>MFA</th><th>Status</th><th></th></tr></thead><tbody>
                ${[["Priya Anand", "Super Admin", "All hubs", "Admin Portal", "on", "Active"], ["Sana K.", "Hub Admin", "Koramangala", "Admin Portal", "on", "Active"], ["Rahul Sharma", "Hub Employee", "Whitefield", "Employee + Inspection", "off", "Active"], ["Arjun P.", "Hub Employee", "Whitefield", "Employee + Inspection", "off", "Active"]].map(u => `<tr><td class="car-mini"><div class="avatar-xs">${u[0][0]}</div><b>${u[0]}</b></td><td>${chip(u[1], u[1].includes("Admin") ? "navy" : "teal")}</td><td>${u[2]}</td><td class="tiny">${u[3]}</td><td>${u[4] === "on" ? chip("MFA on", "green") : chip("No MFA", "outline")}</td><td><span class="status-dot" style="color:var(--emerald-500)">${u[5]}</span></td><td><button class="btn btn-ghost btn-sm">Edit</button></td></tr>`).join("")}
              </tbody></table>
            </div>
            <div class="panel"><div class="panel-head"><h3>Role permissions</h3></div><div class="panel-body">
              <table class="tbl"><thead><tr><th>Capability</th><th>Super Admin</th><th>Hub Admin</th><th>Hub Employee</th></tr></thead><tbody>
                ${[["Onboard hubs", "✓", "—", "—"], ["Onboard hub admins", "✓", "—", "—"], ["Onboard hub employees", "✓", "✓ (own hub)", "—"], ["Onboard consignors", "✓", "✓ (own hub)", "—"], ["Manage catalog & pricing", "✓ (all)", "✓ (own hub)", "—"], ["Conduct test drive / inspection", "—", "—", "✓ (own hub)"], ["Reassign Sell/PDI hub", "✓", "—", "—"]].map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}
              </tbody></table>
            </div></div>
          </div>
        </div>
      </div>
    </div>`;

  const adminBranding = () => `
    <div class="screen" id="admin-branding">
      <div class="admin">${adminSidebar("branding")}
        <div class="admin-main">${adminTop("Branding & Dealer Settings")}
          <div class="admin-content"><div class="two-col">
            <div class="panel"><div class="panel-head"><h3>Brand identity</h3></div><div class="panel-body">
              <div class="field"><label>Dealership name</label><input class="input" value="Premium Cars Bengaluru" /></div>
              <div class="field"><label>Logo</label><div class="upload-box">⬆ Upload logo (SVG / PNG)</div></div>
              <div class="form-grid">
                <div class="field"><label>Primary color</label><div class="row gap8"><div style="width:40px;height:40px;border-radius:10px;background:var(--teal-500)"></div><input class="input grow" value="#0FB5A6" /></div></div>
                <div class="field"><label>Accent color</label><div class="row gap8"><div style="width:40px;height:40px;border-radius:10px;background:var(--navy-900)"></div><input class="input grow" value="#0A1628" /></div></div>
              </div>
              <div class="field"><label>Custom domain</label><input class="input" value="premiumcars-bengaluru.com" /></div>
              <div class="form-grid">
                <div class="field"><label>Reservation hold (days)</label><input class="input" type="number" value="15" /></div>
                <div class="field"><label>Min publish score</label><input class="input" type="number" value="70" /></div>
              </div>
              <div class="tiny muted">Hold = days a reserved car is kept before auto-release. Min publish score = inspection score required (with a passing recommendation) to certify & list a car.</div>
            </div></div>
            <div class="panel"><div class="panel-head"><h3>Provider keys</h3></div><div class="panel-body">
              ${[["SMS (MSG91)", "•••• 8842", true], ["Email (SendGrid)", "•••• 1f9c", true], ["Push (FCM)", "Configured", true], ["WhatsApp Business API", "•••• 7c3d", true], ["Maps (Google)", "•••• a1b2", true]].map(p => `<div class="cfg-row" style="padding:12px 0"><div class="cfg-label"><b style="font-size:13.5px">${p[0]}</b><span>${p[1]}</span></div>${p[2] ? chip("Connected", "green") : chip("Add key", "outline")}</div>`).join("")}
            </div></div>
          </div></div>
        </div>
      </div>
    </div>`;

  const adminFlags = () => `
    <div class="screen" id="admin-flags">
      <div class="admin">${adminSidebar("flags")}
        <div class="admin-main">${adminTop("Feature Flags")}
          <div class="admin-content">
            <div class="callout info mb16"><span class="ci">🚩</span><div>Enable newly shipped modules at your own pace — this is the core of the "gradually add features" rollout. Config, not code forks.</div></div>
            <div class="panel"><div class="panel-body">
              ${[["Reviews & Ratings", "Phase 2 · post-drive feedback", true], ["Inspection Services (Sell + PDI)", "Phase 2 · user-initiated requests", true], ["WhatsApp notifications", "In-scope channel · messages & updates", true], ["Recommendations", "Similar cars & price-drop", false], ["Promotions / Coupons", "Phase 2 marketing", false], ["Doorstep test drives", "Concurrent-slot doorstep fleet (within 40 km)", true]].map(f => `<div class="cfg-row"><div class="cfg-label"><b style="font-size:14px">${f[0]}</b><span>${f[1]}</span></div><div class="toggle ${f[2] ? "on" : ""}"></div></div>`).join("")}
            </div></div>
          </div>
        </div>
      </div>
    </div>`;

  const buildAdmin = () => `
    <div class="frame-wrap">
      <div class="frame-label"><span class="dot"></span> Admin Panel · Angular SPA (dealer self-service)</div>
      <div class="desktop">
        <div class="browser-bar"><span class="dots"><i></i><i></i><i></i></span><div class="url"><span class="lock">🔒</span> admin.premiumcars-bengaluru.com</div></div>
        <div class="desktop-screen" id="frame-admin">
          ${adminDash()}${adminInventory()}${adminTd()}${adminLeads()}${adminRes()}${adminReserveForm()}
          ${adminCarForm()}${adminConsignors()}${adminInspections()}${adminHubs()}${adminLeadDetail()}${adminReports()}${adminUsers()}${adminBranding()}${adminFlags()}
        </div>
      </div>
    </div>`;

  // ============================ EMPLOYEE APP ============================
  const empTab = (active) => `
    <div class="tabbar">
      <button class="tab ${active === "sched" ? "active" : ""}" data-go="emp-sched"><span class="ti">📅</span>Schedule</button>
      <button class="tab ${active === "leads" ? "active" : ""}" data-go="emp-leads"><span class="ti">🎯</span>Leads</button>
      <button class="tab ${active === "inv" ? "active" : ""}" data-go="emp-inventory"><span class="ti">🚗</span>Inventory</button>
      <button class="tab ${active === "me" ? "active" : ""}" data-go="emp-profile"><span class="ti">👤</span>Me</button>
    </div>`;

  const empSched = () => `
    <div class="screen active" id="emp-sched">
      ${statusbar()}
      <div class="emp-header">
        <div class="row between"><div><div class="tiny" style="color:var(--ink-300)">Good morning,</div><div style="font-size:19px;font-weight:800">Rahul Sharma</div></div><button class="icon-btn">🔔</button></div>
        <div class="emp-stat-row">
          <div class="emp-stat"><div class="v">6</div><div class="l">Drives today</div></div>
          <div class="emp-stat"><div class="v">12</div><div class="l">Open leads</div></div>
          <div class="emp-stat"><div class="v">2</div><div class="l">Doorstep</div></div>
        </div>
      </div>
      <div class="app-body" style="padding-top:16px">
        <div class="pad-x row between mb12"><div class="section-title">Today · Wed 16 Jul</div><span class="chip teal">Capacity-packed</span></div>
        ${[["09:20", "Aarav Mehta", "Toyota Fortuner", "At Hub · Whitefield", "Confirmed"], ["09:40", "Divya R.", "Kia Seltos", "At Hub · Whitefield", "Confirmed"], ["11:00", "Karan M.", "Honda City", "Doorstep · HSR Layout", "EnRoute"]].map((t, i) => `
          <div class="timeline-item">
            <div class="tl-time">${t[0]}</div>
            <div class="tl-line"><div class="dot2"></div>${i < 2 ? '<div class="ln"></div>' : ""}</div>
            <div class="tl-card" ${t[4] === "Confirmed" ? 'data-go="emp-conduct"' : ""} style="cursor:pointer">
              <div class="row between"><div class="tc-name">${t[1]}</div><span class="chip ${t[4] === "EnRoute" ? "amber" : "green"}">${t[4]}</span></div>
              <div class="tc-sub">🚗 ${t[2]}</div>
              <div class="tiny muted">📍 ${t[3]}</div>
              ${t[4] === "Confirmed" ? '<button class="btn btn-primary btn-sm btn-block mt12" data-go="emp-conduct">Start Drive →</button>' : '<button class="btn btn-ghost btn-sm btn-block mt12" data-go="emp-enroute">Track / navigate →</button>'}
            </div>
          </div>`).join("")}
      </div>
      ${empTab("sched")}
    </div>`;

  const empConduct = () => `
    <div class="screen" id="emp-conduct">
      ${statusbar()}
      <div class="app-topbar navy"><button class="icon-btn" data-go="emp-sched">←</button><div><div style="font-weight:800;font-size:16px">Conduct Test Drive</div><div class="tiny" style="color:var(--ink-300)">#TD-48213 · 9:20 AM</div></div></div>
      <div class="app-body"><div class="pad">
        <div class="car-card" style="cursor:default"><div class="cc-body">
          <div class="row gap12"><div class="car-img g1" style="width:70px;height:52px;border-radius:10px">${carSVG()}</div><div><b>Toyota Fortuner</b><div class="tiny muted">2022 · KA-01-AB-1234</div></div></div>
          <div class="row between mt12"><div><div class="tiny muted">Buyer</div><b>Aarav Mehta</b></div><a href="#" class="chip teal">📞 Call</a></div>
        </div></div>

        <div class="section-title mt20 mb12">Check-in</div>
        <div class="callout info mb16"><span class="ci">🔑</span><div>Ask the buyer for the <b>4-digit OTP</b> sent at confirmation to verify identity.</div></div>
        <div class="center mb16"><div class="otp-box"><i>4</i><i>9</i><i>1</i><i>7</i></div></div>

        <div class="section-title mt8 mb12">Drive log</div>
        <div class="field"><label>Start odometer (km)</label><input class="input" value="38,412" /></div>
        <div class="row gap8">
          <button class="btn btn-ghost grow">📷 Odometer photo</button>
          <button class="btn btn-ghost grow">📷 Car condition</button>
        </div>
      </div></div>
      <div class="sticky-cta">
        <button class="btn btn-ghost grow" data-go="emp-sched">Verify OTP</button>
        <button class="btn btn-primary grow" data-go="emp-complete">Start Drive</button>
      </div>
    </div>`;

  const empComplete = () => `
    <div class="screen" id="emp-complete">
      ${statusbar()}
      <div class="success-wrap">
        <div class="success-check">✓</div>
        <div style="font-size:22px;font-weight:800">Drive Completed</div>
        <div class="muted" style="max-width:280px">Capacity freed for the next slot. Log the buyer's interest to move the lead forward.</div>
        <div class="mt20" style="width:100%;text-align:left">
          <div class="field"><label>Buyer interest level</label><div class="seg"><button>Cold</button><button class="on">Warm</button><button>Hot 🔥</button></div></div>
          <div class="field"><label>Next action</label>
            <div class="seg"><button class="on">Ready to buy</button><button>Follow up</button><button>Lost</button></div>
          </div>
          <div class="field"><label>Notes</label><textarea class="input" rows="3">Loved the drive. Ready to buy — will pay token; Hub Admin to reserve.</textarea></div>
        </div>
        <button class="btn btn-primary btn-block" data-go="emp-sched">Save & move to Negotiation</button>
      </div>
    </div>`;

  const empLeads = () => `
    <div class="screen" id="emp-leads">
      ${statusbar()}
      <div class="app-topbar"><div style="font-weight:800;font-size:18px">My Leads</div><button class="icon-btn" style="margin-left:auto">↕</button></div>
      <div class="pad-x mt8"><div class="pill-row">${["Priority", "New (4)", "Contacted", "SLA breach (1)"].map((p, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}">${p}</span>`).join("")}</div></div>
      <div class="app-body" style="padding-top:12px">
        ${[["Vikram S.", "Fortuner · Negotiation", 97, "🔥 Hot"], ["Rohit V.", "XUV700 · Qualified", 95, ""], ["Neha Gupta", "Creta · Contacted", 88, ""], ["Aarav Mehta", "Fortuner · New", 92, "SLA 12m"], ["Karan M.", "Seltos · New", 68, ""]].map(l => `
          <div class="lead-item" data-go="emp-leaddetail" style="cursor:pointer">
            <div class="score" style="${scoreColor(l[2])}">${l[2]}</div>
            <div class="li-body"><div class="n">${l[0]}</div><div class="s">${l[1]}</div></div>
            ${l[3] ? `<span class="chip ${l[3].includes("SLA") ? "rose" : "amber"}">${l[3]}</span>` : ""}
            <button class="icon-btn">📞</button>
          </div>`).join("")}
      </div>
      ${empTab("leads")}
    </div>`;

  const empLogin = () => `
    <div class="screen" id="emp-login">
      ${statusbar()}
      <div class="login-wrap" style="background:var(--navy-900)">
        <div class="login-logo">◆</div>
        <h1 style="font-size:24px;margin-top:24px;color:#fff">AssureCars<br>Hub Employee</h1>
        <p style="color:var(--ink-300);margin-top:8px">Sign in to run leads, drives and inspections for your hub.</p>
        <div class="mt24">
          <div class="field"><label style="color:var(--ink-300)">Work email</label><input class="input" value="rahul@premiumcars.com" /></div>
          <div class="field"><label style="color:var(--ink-300)">Password</label><input class="input" type="password" value="········" /></div>
        </div>
        <button class="btn btn-primary btn-block" data-go="emp-sched">Sign in</button>
        <div class="callout info mt16"><span class="ci">🔐</span><div>Hub Employee logins open the <b>Employee App + Inspection App</b>, scoped to your assigned hub(s). Super/Hub Admins sign in on the <b>Admin Portal</b> — never here.</div></div>
      </div>
    </div>`;

  const empEnroute = () => `
    <div class="screen" id="emp-enroute">
      ${statusbar()}
      <div class="app-topbar navy"><button class="icon-btn" data-go="emp-sched">←</button><div><div style="font-weight:800;font-size:16px">Doorstep Drive</div><div class="tiny" style="color:var(--ink-300)">#TD-48219 · 11:00 AM</div></div><span class="chip amber" style="margin-left:auto">En route</span></div>
      <div class="app-body"><div class="pad">
        <div class="map-mock"><div class="map-pin start"><span>🏢</span></div><div class="map-car">🚙</div><div class="map-pin end"><span>🏠</span></div></div>
        <div class="eta-band mt16"><div style="font-size:26px">📍</div><div class="grow"><div class="tiny" style="color:var(--ink-300)">Distance to buyer</div><div class="big">3.2 km · 12 min</div></div><a class="chip teal">🧭 Navigate</a></div>
        <div class="car-card mt16" style="cursor:default"><div class="cc-body">
          <div class="row between"><div><div class="tiny muted">Buyer</div><b>Karan Malhotra</b></div><a class="chip teal">📞 Call</a></div>
          <div class="tiny muted mt8">📍 #402, Green Meadows, HSR Layout</div>
          <div class="tiny muted mt8">🚗 Honda City · KA-03-XY-9911</div>
        </div></div>
        <div class="callout info mt16"><span class="ci">🔑</span><div>On arrival, ask the buyer for the OTP to check in and start the drive.</div></div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-ghost grow" data-go="emp-sched">Share live ETA</button><button class="btn btn-primary grow" data-go="emp-conduct">I've arrived →</button></div>
    </div>`;

  const empLeadDetail = () => `
    <div class="screen" id="emp-leaddetail">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="emp-leads">←</button><div><div style="font-weight:800;font-size:16px">Vikram Singh</div><div class="tiny muted">#LD-90188</div></div><span class="chip amber" style="margin-left:auto">Negotiation</span></div>
      <div class="app-body"><div class="pad">
        <div class="row gap8"><a class="btn btn-primary btn-sm grow">📞 Call</a><a class="btn btn-ghost btn-sm grow">💬 WhatsApp</a></div>
        <div class="car-card mt16" style="cursor:default"><div class="cc-body">
          <div class="row gap12"><div class="car-img g1" style="width:64px;height:48px;border-radius:10px">${carSVG()}</div><div><b>Toyota Fortuner</b><div class="tiny muted">₹38.75 L · Whitefield Hub</div></div><span class="chip green" style="margin-left:auto">97</span></div>
        </div></div>
        <div class="section-title mt20 mb12">Timeline</div>
        <div class="timeline-mini">
          <div class="tm-item done"><div class="tm-t">Interest via website</div><div class="tm-s">14 Jul</div></div>
          <div class="tm-item done"><div class="tm-t">Contacted · interested</div><div class="tm-s">14 Jul</div></div>
          <div class="tm-item done"><div class="tm-t">Test drive completed · warm</div><div class="tm-s">16 Jul</div></div>
          <div class="tm-item active"><div class="tm-t">Negotiation</div><div class="tm-s">Now</div></div>
        </div>
        <div class="field mt16"><label>Update status</label><div class="seg"><button>Qualified</button><button class="on">Negotiation</button><button>Won</button><button>Lost</button></div></div>
        <div class="field"><label>Log note</label><textarea class="input" rows="2" placeholder="Disposition / next action…"></textarea></div>
      </div></div>
      <div class="sticky-cta"><button class="btn btn-primary btn-block" data-go="emp-reservations">Mark buyer ready · Hub Admin reserves</button></div>
    </div>`;

  const empInventory = () => `
    <div class="screen" id="emp-inventory">
      ${statusbar()}
      <div class="app-topbar"><div style="font-weight:800;font-size:18px">Hub Inventory</div><button class="icon-btn" style="margin-left:auto" data-go="emp-sched">✕</button></div>
      <div class="pad-x mt8"><div class="pill-row">${["Whitefield (62)", "Available", "In maintenance", "Reserved"].map((p, i) => `<span class="chip ${i === 0 ? "navy" : "outline"}">${p}</span>`).join("")}</div></div>
      <div class="app-body" style="padding-top:12px"><div class="pad" style="display:flex;flex-direction:column;gap:12px">
        ${[cars[0], cars[2], cars[5]].map((c, i) => `
          <div class="car-card" style="cursor:default"><div class="cc-body">
            <div class="row gap12"><div class="car-img ${c.grad}" style="width:64px;height:48px;border-radius:10px">${carSVG()}</div><div class="grow"><b>${c.name}</b><div class="tiny muted">${c.year} · ${c.km} km</div></div>${i === 2 ? chip("Maintenance", "amber") : chip("Live", "green")}</div>
            <div class="cfg-row" style="padding:11px 0;border:none"><div class="cfg-label"><b style="font-size:13px">Test-drive available</b><span>Toggle to suspend future slots</span></div><div class="toggle ${i === 2 ? "" : "on"}"></div></div>
            <div class="cfg-row" style="padding:0 0 6px;border:none"><div class="cfg-label"><b style="font-size:13px">Capacity / slot</b></div><div class="stepper"><button data-step="-1" data-target="einv${i}">−</button><span class="val" id="einv${i}">3</span><button data-step="1" data-target="einv${i}">+</button></div></div>
          </div></div>`).join("")}
      </div></div>
      ${empTab("")}
    </div>`;

  const empReservations = () => `
    <div class="screen" id="emp-reservations">
      ${statusbar()}
      <div class="app-topbar"><button class="icon-btn" data-go="emp-leads">←</button><div style="font-weight:800;font-size:18px">Reservation Follow-Up</div></div>
      <div class="app-body"><div class="pad" style="display:flex;flex-direction:column;gap:14px">
        <div class="callout info"><span class="ci">🔔</span><div>Your <b>Hub Admin</b> flagged these reserved cars for you to <b>follow up on the final deal</b>. Reservations are read-only here — the Hub Admin marks them Sold or releases them.</div></div>
        <div class="car-card" style="cursor:default"><div class="cc-body">
          <div class="row between"><b>Hyundai Creta</b><span class="chip amber">Reserved</span></div>
          <div class="tiny muted mt8">Neha Gupta · #RS-3391 · 3 / 15 days pending</div>
          <div class="row gap8 mt12"><a class="btn btn-primary btn-sm grow">📞 Call buyer</a><a class="btn btn-ghost btn-sm grow">💬 WhatsApp</a></div>
        </div></div>
        <div class="car-card" style="cursor:default"><div class="cc-body">
          <div class="row between"><b>Toyota Fortuner</b><span class="chip teal">Deal in progress</span></div>
          <div class="tiny muted mt8">Vikram S. · #RS-3402 · 6 / 15 days pending</div>
          <div class="row gap8 mt12"><a class="btn btn-primary btn-sm grow">📞 Call buyer</a><button class="btn btn-ghost btn-sm grow">Add note</button></div>
        </div></div>
      </div></div>
      ${empTab("")}
    </div>`;

  const empProfile = () => `
    <div class="screen" id="emp-profile">
      ${statusbar()}
      <div class="emp-header" style="padding-bottom:24px">
        <div class="row between"><div style="font-weight:800;font-size:18px">My Profile</div><button class="icon-btn" data-go="emp-sched">✕</button></div>
        <div class="row gap12 mt16"><div class="avatar-xs" style="width:56px;height:56px;font-size:22px">R</div><div><div style="font-weight:800;font-size:17px">Rahul Sharma</div><div class="tiny" style="color:var(--ink-300)">Sales Executive · Whitefield Hub</div></div></div>
      </div>
      <div class="app-body" style="padding-top:16px"><div class="pad">
        <div class="emp-stat-row" style="margin-top:0">
          <div class="emp-stat" style="background:var(--ink-050)"><div class="v" style="color:var(--ink-900)">84</div><div class="l" style="color:var(--ink-500)">Leads (30d)</div></div>
          <div class="emp-stat" style="background:var(--ink-050)"><div class="v" style="color:var(--ink-900)">31%</div><div class="l" style="color:var(--ink-500)">Win rate</div></div>
          <div class="emp-stat" style="background:var(--ink-050)"><div class="v" style="color:var(--ink-900)">4.8★</div><div class="l" style="color:var(--ink-500)">Rating</div></div>
        </div>
        <div class="section-title mt20 mb8">Availability</div>
        <div class="cfg-row" style="padding:13px 0"><div class="cfg-label"><b style="font-size:14px">Available for doorstep</b><span>Accept doorstep drive assignments</span></div><div class="toggle on"></div></div>
        <div class="section-title mt12 mb8">More</div>
        ${["📋 My completed drives", "🔔 Notification settings", "🌐 Language · English", "❓ Help & support"].map(x => `<div class="report-row" style="padding:15px 0">${x}<span class="st muted">›</span></div>`).join("")}
        <button class="btn btn-ghost btn-block mt16" data-go="emp-login" style="color:var(--rose-500);border-color:var(--rose-050)">Sign out</button>
      </div></div>
      ${empTab("")}
    </div>`;

  const buildEmp = () => `
    <div class="frame-wrap">
      <div class="frame-label"><span class="dot"></span> Dealership Employee App · Flutter (field ops)</div>
      <div class="phone"><div class="notch"></div><div class="phone-screen" id="frame-emp">
        ${empSched()}${empConduct()}${empComplete()}${empLeads()}
        ${empLogin()}${empEnroute()}${empLeadDetail()}${empInventory()}${empReservations()}${empProfile()}
      </div></div>
    </div>`;

  // ============================ MOUNT + ROUTER ============================
  document.getElementById("view-app").innerHTML = buildApp();
  document.getElementById("view-web").innerHTML = buildWeb();
  document.getElementById("view-admin").innerHTML = buildAdmin();
  document.getElementById("view-emp").innerHTML = buildEmp();

  const hints = {
    app: "Flagship flow · <b>Concurrent-slot test-drive booking</b>",
    web: "SEO storefront · <b>Browse → car detail → inspection report</b>",
    admin: "Dealer self-service · <b>Test-drive capacity config</b>",
    emp: "Field ops · <b>Conduct doorstep test drive</b>"
  };

  // surface switching
  document.getElementById("surfaceTabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-surface]");
    if (!b) return;
    const s = b.dataset.surface;
    document.querySelectorAll("#surfaceTabs button").forEach((x) => x.classList.toggle("active", x === b));
    document.querySelectorAll(".surface-view").forEach((v) => v.classList.toggle("active", v.dataset.view === s));
    document.getElementById("flowHint").innerHTML = hints[s];
  });

  // in-frame navigation + interactions
  document.body.addEventListener("click", (e) => {
    // navigate between screens
    const go = e.target.closest("[data-go]");
    if (go) {
      const carEl = go.closest("[data-car]") || go;
      if (carEl && carEl.dataset && carEl.dataset.car) currentCarId = carEl.dataset.car;
      const targetId = go.dataset.go;
      const target = document.getElementById(targetId);
      if (target) {
        // capture parent BEFORE re-render (rerenderDynamic replaces the target node)
        const parent = target.parentElement;
        // re-render detail-dependent screens so they reflect the selected car
        rerenderDynamic(targetId);
        parent.querySelectorAll(":scope > .screen").forEach((s) => s.classList.remove("active"));
        const finalTarget = document.getElementById(targetId);
        finalTarget.classList.add("active");
        finalTarget.scrollTop = 0;
        parent.scrollTop = 0;
        e.preventDefault();
      }
    }

    // single-select groups
    const groupSel = (el, groupSelector, itemSelector) => {
      const group = el.closest(groupSelector);
      if (!group) return;
      group.querySelectorAll(itemSelector).forEach((i) => i.classList.remove("on"));
      el.classList.add("on");
    };
    const day = e.target.closest(".day"); if (day) groupSel(day, ".day-row", ".day");
    const slot = e.target.closest(".slot:not(.full)"); if (slot) groupSel(slot, ".slot-grid", ".slot");
    const mode = e.target.closest(".mode"); if (mode) groupSel(mode, ".mode-toggle", ".mode");
    const segb = e.target.closest(".seg button"); if (segb) groupSel(segb, ".seg", "button");
    const chk = e.target.closest(".check"); if (chk) chk.classList.toggle("on");
    const tog = e.target.closest(".toggle"); if (tog) tog.classList.toggle("on");

    // stepper
    const step = e.target.closest("[data-step]");
    if (step) {
      const valEl = document.getElementById(step.dataset.target);
      let v = parseInt(valEl.textContent, 10) + parseInt(step.dataset.step, 10);
      if (v < 0) v = 0;
      valEl.textContent = v;
      if (step.hasAttribute("data-cap")) { const echo = document.getElementById("capEcho"); if (echo) echo.textContent = v; renderCapPreview(v); }
    }
  });

  // dynamic re-render for car-dependent screens
  function rerenderDynamic(targetId) {
    const map = {
      "app-detail": [appDetail, "frame-app"],
      "app-book": [appBook, "frame-app"],
      "app-book-success": [appBookSuccess, "frame-app"],
      "app-interest": [appInterest, "frame-app"],
      "app-emi": [appEmi, "frame-app"],
      "web-detail": [webDetail, "frame-web"],
      "web-book": [webBook, "frame-web"]
    };
    if (!map[targetId]) return;
    const [fn] = map[targetId];
    const old = document.getElementById(targetId);
    if (!old) return;
    const wasActive = old.classList.contains("active");
    const tmp = document.createElement("div");
    tmp.innerHTML = fn().trim();
    const fresh = tmp.firstElementChild;
    if (wasActive) fresh.classList.add("active");
    old.replaceWith(fresh);
  }

  // capacity preview renderer (admin TD config)
  function renderCapPreview(cap) {
    const host = document.getElementById("capSlots");
    if (!host) return;
    const times = ["09:00", "10:00", "11:00", "12:00"];
    const booked = [cap, Math.max(0, cap - 1), cap, 1];
    host.innerHTML = times.map((t, i) => {
      const pct = Math.min(100, (booked[i] / cap) * 100);
      return `<div class="cap-slot"><div class="t">${t}</div><div class="bar"><i style="width:${pct}%"></i></div><div class="c">${booked[i]}/${cap} booked</div></div>`;
    }).join("");
  }
  renderCapPreview(3);
})();
