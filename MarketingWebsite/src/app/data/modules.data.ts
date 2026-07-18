export interface Screenshot {
  src: string;
  alt: string;
  caption: string;
  order: number;
}

export interface ProductModule {
  id: string;
  name: string;
  tagline: string;
  stack: string;
  icon: string;
  deviceType: 'mobile' | 'desktop';
  order: number;
  screenshots: Screenshot[];
}

export const SITE_CONFIG = {
  brandName: 'AssureCars',
  tagline: 'The Complete Pre-Owned Car Platform',
  subtitle: 'Five integrated modules powering every dealer touchpoint — from discovery to inspection to sale.',
  prototypeUrl: 'https://boisterous-smakager-5b29ff.netlify.app/',
  prototypeLabel: 'Interactive UI Prototype',
  year: 2026,
};

export const PRODUCT_MODULES: ProductModule[] = [
  {
    id: 'user-app',
    name: 'User App',
    tagline: 'Buyers browse certified inventory, send interest, and book test drives — all from their phone.',
    stack: 'Flutter · Android / iOS',
    icon: '📱',
    deviceType: 'mobile',
    order: 1,
    screenshots: [
      { src: '/assets/screenshots/user-app-home.png', alt: 'User App home screen with certified car listings', caption: 'Home & Discovery', order: 1 },
      { src: '/assets/screenshots/user-app-search.png', alt: 'User App search and filter screen', caption: 'Search & Filter', order: 2 },
      { src: '/assets/screenshots/user-app-detail.png', alt: 'User App vehicle detail with inspection report', caption: 'Car Detail & Report', order: 3 },
      { src: '/assets/screenshots/user-app-booking.png', alt: 'User App concurrent-slot test drive booking', caption: 'Test-Drive Booking', order: 4 },
    ],
  },
  {
    id: 'website',
    name: 'Website',
    tagline: 'SEO-optimized storefront for browsing inventory, viewing reports, and capturing buyer intent.',
    stack: 'Angular · SSR / SEO',
    icon: '🖥️',
    deviceType: 'desktop',
    order: 2,
    screenshots: [
      { src: '/assets/screenshots/website-home.png', alt: 'Customer website homepage with hero search', caption: 'Homepage', order: 1 },
      { src: '/assets/screenshots/website-listing.png', alt: 'Customer website car listing with filters', caption: 'Browse & Filter', order: 2 },
      { src: '/assets/screenshots/website-detail.png', alt: 'Customer website vehicle detail page', caption: 'Car Detail', order: 3 },
    ],
  },
  {
    id: 'admin-panel',
    name: 'Admin Panel',
    tagline: 'Dealer self-service for inventory, leads, test-drive capacity, reservations, and publish gates.',
    stack: 'Angular · Dealer SPA',
    icon: '⚙️',
    deviceType: 'desktop',
    order: 3,
    screenshots: [
      { src: '/assets/screenshots/admin-dashboard.png', alt: 'Admin panel dashboard with KPIs', caption: 'Dashboard', order: 1 },
      { src: '/assets/screenshots/admin-inventory.png', alt: 'Admin panel inventory management', caption: 'Inventory & Catalog', order: 2 },
      { src: '/assets/screenshots/admin-testdrive-config.png', alt: 'Admin panel test-drive capacity configuration', caption: 'Test-Drive Config', order: 3 },
      { src: '/assets/screenshots/admin-reservations.png', alt: 'Admin panel reserved vehicles worklist', caption: 'Reserved Vehicles', order: 4 },
      { src: '/assets/screenshots/admin-reserve-form.png', alt: 'Admin panel reserve car form linked to a lead', caption: 'Reserve a Lead', order: 5 },
    ],
  },
  {
    id: 'employee-app',
    name: 'Employee App',
    tagline: 'Field staff manage schedules, conduct doorstep drives, and nurture leads on the go.',
    stack: 'Flutter · Field Ops',
    icon: '🧰',
    deviceType: 'mobile',
    order: 4,
    screenshots: [
      { src: '/assets/screenshots/employee-schedule.png', alt: 'Employee app daily schedule view', caption: 'Daily Schedule', order: 1 },
      { src: '/assets/screenshots/employee-conduct-drive.png', alt: 'Employee app conduct test drive screen', caption: 'Conduct Drive', order: 2 },
      { src: '/assets/screenshots/employee-leads.png', alt: 'Employee app leads pipeline', caption: 'Leads & CRM', order: 3 },
      { src: '/assets/screenshots/employee-reservation-followup.png', alt: 'Employee app reservation follow-up screen', caption: 'Reservation Follow-Up', order: 4 },
    ],
  },
  {
    id: 'inspection-app',
    name: 'Inspection App',
    tagline: 'Certified technicians run checklist-first inspections, AI verification, and PDF report export.',
    stack: 'Kotlin · Android',
    icon: '🔍',
    deviceType: 'mobile',
    order: 5,
    screenshots: [
      { src: '/assets/screenshots/inspection-checklist.png', alt: 'Inspection app 200-point checklist hub', caption: 'Checklist Hub', order: 1 },
      { src: '/assets/screenshots/inspection-capture.png', alt: 'Inspection app photo capture screen', caption: 'Photo Capture', order: 2 },
      { src: '/assets/screenshots/inspection-report.png', alt: 'Inspection app grade report summary', caption: 'Grade Report', order: 3 },
    ],
  },
];
