import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { DataService } from '../../core/services/data.service';
import { Delivery } from '../../core/models/delivery';
import { REGIONS } from '../../core/constants/app-constants';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent implements OnInit {
  deliveries: Delivery[] = [];
  displayedColumns: string[] = ['id', 'region', 'localite', 'typePersonnel', 'nomPersonnel', 'dateLivraison', 'statut'];
  regions = ['Toutes', ...REGIONS];
  selectedRegion = 'Toutes';

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.deliveries = this.dataService.getDeliveriesByRegion(this.selectedRegion);
  }

  onRegionChange(): void {
    this.loadData();
  }
}
