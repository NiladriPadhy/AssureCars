import { Component } from '@angular/core';
import { SITE_CONFIG } from '../../data/modules.data';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="border-t border-white/10 py-10">
      <div class="mx-auto max-w-7xl px-6 text-center">
        <div class="mb-4 inline-flex items-center gap-2 font-bold text-white">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-teal-500 to-teal-600 text-xs text-white"
            aria-hidden="true"
          >
            ◆
          </span>
          {{ config.brandName }}
        </div>
        <p class="text-sm text-ink-400">Platform Showcase · Product modules preview</p>
        <p class="mt-3">
          <a
            [href]="config.prototypeUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-500 transition hover:text-teal-400"
          >
            Open {{ config.prototypeLabel }} ↗
          </a>
        </p>
        <p class="mt-4 text-xs text-ink-500">
          © {{ config.year }} AssureCars. All screenshots from product prototypes.
        </p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  readonly config = SITE_CONFIG;
}
