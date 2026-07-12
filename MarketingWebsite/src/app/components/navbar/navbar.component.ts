import { Component } from '@angular/core';
import { PRODUCT_MODULES, SITE_CONFIG } from '../../data/modules.data';

@Component({
  selector: 'app-navbar',
  standalone: true,
  template: `
    <header
      class="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-navy-900/80 backdrop-blur-md"
    >
      <nav class="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4" aria-label="Main navigation">
        <a href="#" class="flex items-center gap-2.5 font-bold text-white">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-sm text-white"
            aria-hidden="true"
          >
            ◆
          </span>
          AssureCars
        </a>
        <div class="hidden flex-1 items-center justify-center gap-1 md:flex">
          @for (mod of modules; track mod.id) {
            <a
              [href]="'#' + mod.id"
              class="rounded-lg px-3 py-2 text-sm font-semibold text-ink-300 transition hover:bg-white/10 hover:text-white"
            >
              {{ mod.name }}
            </a>
          }
        </div>
        <a
          [href]="prototypeUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-50/10 px-4 py-2 text-sm font-bold text-teal-500 transition hover:bg-teal-50/20 md:ml-0"
        >
          Live Prototype ↗
        </a>
        <a
          href="#modules"
          class="hidden rounded-lg bg-white px-4 py-2 text-sm font-bold text-navy-900 shadow-sm transition hover:bg-ink-100 sm:inline-flex"
        >
          All Modules
        </a>
      </nav>
    </header>
  `,
})
export class NavbarComponent {
  readonly modules = PRODUCT_MODULES;
  readonly prototypeUrl = SITE_CONFIG.prototypeUrl;
}
