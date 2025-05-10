// app.routes.ts
import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { FileImportComponent } from './features/file-import/file-import.component';
import { DataTableComponent } from './features/data-table/data-table.component';
import { ManualEntryComponent } from './features/manual-entry/manual-entry.component';
import { RegionDeliveryComponent } from './features/region-delivery/region-delivery.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'import', component: FileImportComponent },
  { path: 'data', component: DataTableComponent },
  { path: 'entry', component: ManualEntryComponent },
  { path: 'regions', component: RegionDeliveryComponent },
  { path: '**', redirectTo: 'dashboard' }
];
