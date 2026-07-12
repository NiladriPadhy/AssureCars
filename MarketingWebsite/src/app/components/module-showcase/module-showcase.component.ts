import { Component, input } from '@angular/core';
import { ProductModule } from '../../data/modules.data';
import { ScreenshotGalleryComponent } from '../screenshot-gallery/screenshot-gallery.component';

@Component({
  selector: 'app-module-showcase',
  standalone: true,
  imports: [ScreenshotGalleryComponent],
  template: `
    <section
      [id]="module().id"
      class="scroll-mt-24 py-16 md:py-24"
      [class.bg-white/5]="module().order % 2 === 0"
    >
      <div class="mx-auto max-w-7xl px-6">
        <div
          class="flex flex-col gap-10 lg:items-center lg:gap-16"
          [class.lg:flex-row]="module().order % 2 === 1"
          [class.lg:flex-row-reverse]="module().order % 2 === 0"
        >
          <div class="flex-1 lg:max-w-md">
            <div class="mb-4 inline-flex items-center gap-3">
              <span class="text-3xl" aria-hidden="true">{{ module().icon }}</span>
              <span
                class="rounded-full border border-teal-500/30 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-600"
              >
                {{ module().stack }}
              </span>
            </div>
            <h2 class="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              {{ module().name }}
            </h2>
            <p class="mt-4 text-lg leading-relaxed text-ink-300">
              {{ module().tagline }}
            </p>
            <div class="mt-6 flex items-center gap-2 text-sm text-ink-400">
              <span
                class="inline-block h-2 w-2 rounded-full bg-teal-500"
                aria-hidden="true"
              ></span>
              {{ module().deviceType === 'mobile' ? 'Mobile experience' : 'Desktop experience' }}
            </div>
          </div>
          <div class="flex-[1.4]">
            <app-screenshot-gallery
              [screenshots]="module().screenshots"
              [deviceType]="module().deviceType"
            />
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ModuleShowcaseComponent {
  module = input.required<ProductModule>();
}
