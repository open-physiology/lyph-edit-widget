import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';

import { DemoAppModule } from './app';

enableProdMode();

platformBrowserDynamic().bootstrapModule(DemoAppModule);
