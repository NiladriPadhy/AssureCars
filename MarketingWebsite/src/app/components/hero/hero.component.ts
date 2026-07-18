import { Component } from '@angular/core';
import { PRODUCT_MODULES, SITE_CONFIG } from '../../data/modules.data';

@Component({
  selector: 'app-hero',
  standalone: true,
  template: `
    <section class="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28">
      <div class="mx-auto max-w-7xl px-6 text-center">
        <div class="mb-8 inline-flex items-center gap-3">
          <span
            class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-xl font-bold text-white shadow-glow"
            aria-hidden="true"
          >
            ◆
          </span>
          <span class="text-left">
            <span class="block text-2xl font-extrabold text-white">{{ config.brandName }}</span>
            <span class="block text-xs font-medium uppercase tracking-widest text-ink-400">
              Premium Certified Resale
            </span>
          </span>
        </div>
        <h1 class="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
          {{ config.tagline }}
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-300 md:text-xl">
          {{ config.subtitle }}
        </p>
        <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            [href]="config.prototypeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-8 py-4 text-sm font-bold text-white shadow-glow transition hover:brightness-105"
          >
            Try Full Prototype ↗
          </a>
          <a
            href="#modules"
            class="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:border-teal-500/50 hover:bg-white/15"
          >
            Explore Modules
          </a>
          <a
            href="#user-app"
            class="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:border-teal-500/50 hover:bg-white/15"
          >
            View Screenshots
          </a>
        </div>
        <p class="mx-auto mt-6 max-w-xl text-sm text-ink-400">
          Walk through every module interactively —
          <a
            [href]="config.prototypeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-teal-500 underline decoration-teal-500/40 underline-offset-2 transition hover:text-teal-400"
          >
            {{ config.prototypeLabel }}
          </a>
          (User App, Website, Admin Panel, Employee App, Inspection App flows)
        </p>
        <div class="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          @for (mod of modules; track mod.id) {
            <a
              [href]="'#' + mod.id"
              class="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-ink-200 transition hover:border-teal-500/40 hover:text-white"
            >
              {{ mod.name }}
            </a>
          }
        </div>
        <div class="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-6 border-t border-white/10 pt-10">
          <div>
            <div class="text-2xl font-extrabold text-white md:text-3xl">5</div>
            <div class="mt-1 text-sm text-ink-400">Client Modules</div>
          </div>
          <div>
            <div class="text-2xl font-extrabold text-white md:text-3xl">200-pt</div>
            <div class="mt-1 text-sm text-ink-400">Inspection Standard</div>
          </div>
          <div>
            <div class="text-2xl font-extrabold text-white md:text-3xl">1 API</div>
            <div class="mt-1 text-sm text-ink-400">Single Source of Truth</div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class HeroComponent {
  readonly config = SITE_CONFIG;
  readonly modules = PRODUCT_MODULES;
}
