import { Component } from '@angular/core';
import { HeroComponent } from '../../components/hero/hero.component';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ModuleOverviewComponent } from '../../components/module-overview/module-overview.component';
import { ModuleShowcaseComponent } from '../../components/module-showcase/module-showcase.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { PRODUCT_MODULES } from '../../data/modules.data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    ModuleOverviewComponent,
    ModuleShowcaseComponent,
    FooterComponent,
  ],
  template: `
    <app-navbar />
    <main>
      <app-hero />
      <app-module-overview />
      @for (mod of modules; track mod.id) {
        <app-module-showcase [module]="mod" />
      }
    </main>
    <app-footer />
  `,
})
export class HomeComponent {
  readonly modules = PRODUCT_MODULES;
}
