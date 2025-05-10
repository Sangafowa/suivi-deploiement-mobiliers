import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

import { DataService, RegionDeliveryStatus } from '../../core/services/data.service';
import { InventoryService } from '../../core/services/inventory.service';

@Component({
  selector: 'app-region-delivery',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './region-delivery.component.html',
  styleUrls: ['./region-delivery.component.scss']
})
export class RegionDeliveryComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['region', 'totalPlanned', 'totalDelivered', 'percentage', 'status', 'actions'];
  detailColumns: string[] = ['mobilier', 'planned', 'delivered', 'percentage', 'progress'];

  dataSource = new MatTableDataSource<RegionDeliveryStatus>([]);
  detailDataSource = new MatTableDataSource<any>([]);

  regionSummaries: RegionDeliveryStatus[] = [];
  expandedRegion: string | null = null;
  isLoading = false;

  private subscriptions: Subscription[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dataService: DataService,
    private inventoryService: InventoryService
  ) {}

  ngOnInit(): void {
    this.isLoading = true;

    // S'abonner à l'indicateur de chargement
    this.subscriptions.push(
      this.dataService.isLoading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );

    // Récupérer les données et s'abonner aux changements
    // Rafraîchir les données toutes les 5 secondes ou lorsque les livraisons changent
    this.subscriptions.push(
      interval(5000).pipe(
        startWith(0),
        switchMap(() => this.dataService.deliveryData$)
      ).subscribe(() => {
        this.loadData();
      })
    );
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadData(): void {
    // Récupérer les données de livraison par région
    this.regionSummaries = this.dataService.getRegionDeliveryStatus();
    this.dataSource.data = this.regionSummaries;

    // Si une région était développée, mettre à jour les détails
    if (this.expandedRegion) {
      this.updateDetailData(this.expandedRegion);
    }

    this.isLoading = false;
  }

  toggleDetails(region: string): void {
    if (this.expandedRegion === region) {
      // Fermer les détails
      this.expandedRegion = null;
      this.detailDataSource.data = [];
    } else {
      // Ouvrir les détails
      this.expandedRegion = region;
      this.updateDetailData(region);
    }
  }

  updateDetailData(region: string): void {
    const regionData = this.regionSummaries.find(r => r.region === region);

    if (regionData) {
      const detailsArray = Object.keys(regionData.detailsByMobilier).map(mobilier => ({
        mobilier,
        planned: regionData.detailsByMobilier[mobilier].planned,
        delivered: regionData.detailsByMobilier[mobilier].delivered,
        percentage: regionData.detailsByMobilier[mobilier].percentage
      }));

      this.detailDataSource.data = detailsArray;
    }
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 100) return 'primary';
    if (percentage >= 60) return 'accent';
    return 'warn';
  }

  exportRegionReport(region: string): void {
    this.dataService.exportRegionReport(region);
  }
}
