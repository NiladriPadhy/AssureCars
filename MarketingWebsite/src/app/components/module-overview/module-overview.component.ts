import { Component } from '@angular/core';
import { PRODUCT_MODULES, SITE_CONFIG } from '../../data/modules.data';

@Component({
  selector: 'app-module-overview',
  standalone: true,
  template: `
    <section id="modules" class="scroll-mt-24 py-16">
      <div class="mx-auto max-w-7xl px-6">
        <div class="mb-12 text-center">
          <h2 class="text-3xl font-extrabold text-white md:text-4xl">Five Modules, One Platform</h2>
          <p class="mx-auto mt-4 max-w-2xl text-lg text-ink-300">
            Every client surface shares the same API, design language, and certified inventory.
          </p>
        </div>
        <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          @for (mod of modules; track mod.id) {
            <a
              [href]="'#' + mod.id"
              class="group flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-teal-500/40 hover:bg-white/10 hover:shadow-glow"
            >
              <span class="text-3xl" aria-hidden="true">{{ mod.icon }}</span>
              <h3 class="mt-4 text-lg font-bold text-white group-hover:text-teal-500">
                {{ mod.name }}
              </h3>
              <p class="mt-2 flex-1 text-sm leading-relaxed text-ink-400">
                {{ mod.tagline }}
              </p>
              <span class="mt-4 text-xs font-semibold uppercase tracking-wide text-teal-500">
                {{ mod.stack }}
              </span>
            </a>
          }
        </div>
        <div
          class="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl border border-teal-500/25 bg-gradient-to-r from-navy-800/80 to-teal-600/20 p-8 text-center md:flex-row md:text-left"
        >
          <div>
            <h3 class="text-xl font-bold text-white">Explore the full interactive workflow</h3>
            <p class="mt-2 max-w-xl text-sm leading-relaxed text-ink-300">
              Switch between User App, Website, Admin Panel, Employee App, and Inspection App surfaces.
              Tap through flagship flows like concurrent-slot test-drive booking and checklist-first inspection.
            </p>
          </div>
          <a
            [href]="prototypeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-navy-900 shadow-md transition hover:bg-ink-100"
          >
            Open Live Prototype ↗
          </a>
        </div>
      </div>
    </section>
  `,
})
export class ModuleOverviewComponent {
  readonly modules = PRODUCT_MODULES;
  readonly prototypeUrl = SITE_CONFIG.prototypeUrl;
}
