import { Component, input } from '@angular/core';
import { Screenshot } from '../../data/modules.data';

@Component({
  selector: 'app-screenshot-gallery',
  standalone: true,
  template: `
    <div
      class="grid gap-4"
      [class.grid-cols-1]="screenshots().length <= 2"
      [class.sm:grid-cols-2]="screenshots().length > 2"
      [class.lg:grid-cols-2]="deviceType() === 'desktop'"
      [class.xl:grid-cols-3]="deviceType() === 'desktop' && screenshots().length >= 3"
    >
      @for (shot of screenshots(); track shot.src) {
        <figure class="group overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition-transform hover:-translate-y-1">
          <div
            class="relative overflow-hidden bg-ink-50"
            [class.aspect-[9/19]]="deviceType() === 'mobile'"
            [class.aspect-[16/10]]="deviceType() === 'desktop'"
          >
            <img
              [src]="shot.src"
              [alt]="shot.alt"
              [attr.loading]="shot.order > 1 ? 'lazy' : 'eager'"
              class="h-full w-full object-cover object-top"
              (error)="onImageError($event, shot.caption)"
            />
          </div>
          <figcaption class="px-4 py-3 text-sm font-semibold text-ink-700">
            {{ shot.caption }}
          </figcaption>
        </figure>
      }
    </div>
  `,
})
export class ScreenshotGalleryComponent {
  screenshots = input.required<Screenshot[]>();
  deviceType = input<'mobile' | 'desktop'>('mobile');

  onImageError(event: Event, caption: string): void {
    const img = event.target as HTMLImageElement;
    img.alt = `${caption} (preview unavailable)`;
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent && !parent.querySelector('.placeholder')) {
      const placeholder = document.createElement('div');
      placeholder.className =
        'placeholder flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-50 to-ink-100 text-sm font-medium text-ink-500';
      placeholder.textContent = caption;
      parent.appendChild(placeholder);
    }
  }
}
