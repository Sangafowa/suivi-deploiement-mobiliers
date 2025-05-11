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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

import { DataService, RegionDeliveryStatus } from '../../core/services/data.service';
import { InventoryService } from '../../core/services/inventory.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

// Interface pour les données de détail du mobilier
interface MobilierDetail {
  mobilier: string;
  planned: number;
  delivered: number;
  percentage: number;
}

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
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './region-delivery.component.html',
  styleUrls: ['./region-delivery.component.scss']
})
export class RegionDeliveryComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = ['region', 'totalPlanned', 'confirmedEquipments','totalDelivered', 'percentage', 'status', 'actions'];
  detailColumns: string[] = ['mobilier', 'planned', 'delivered', 'percentage', 'progress', 'actions'];

  dataSource = new MatTableDataSource<RegionDeliveryStatus>([]);
  detailDataSource = new MatTableDataSource<MobilierDetail>([]);

  regionSummaries: RegionDeliveryStatus[] = [];
  expandedRegion: string | null = null;
  isLoading = false;

  private subscriptions: Subscription[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dataService: DataService,
    private inventoryService: InventoryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
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

    // S'abonner aux changements des confirmations régionales
    this.subscriptions.push(
      this.dataService.regionConfirmations$.subscribe(() => {
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
      const detailsArray = Object.keys(regionData.detailsByMobilier).map(mobilier => {
        // Vérifier s'il y a déjà une confirmation pour ce type de mobilier
        const confirmedCount = this.dataService.getMobilierConfirmationCount(region, mobilier);

        // Si un nombre est confirmé, l'utiliser pour remplacer le nombre livré
        const delivered = confirmedCount > 0 ? confirmedCount : regionData.detailsByMobilier[mobilier].delivered;
        const percentage = regionData.detailsByMobilier[mobilier].planned > 0 ?
          Math.round((delivered / regionData.detailsByMobilier[mobilier].planned) * 100) : 0;

        return {
          mobilier,
          planned: regionData.detailsByMobilier[mobilier].planned,
          delivered: delivered,
          percentage: percentage
        };
      });

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
  /**
   * Ouvre le dialogue de confirmation d'équipement
   * @param region Nom de la région
   * @param mobilierDetail Détails du mobilier à confirmer
   */
  openEquipmentConfirmation(region: string, mobilierDetail: MobilierDetail): void {
    // Récupérer le nombre d'équipements déjà confirmés (s'il existe)
    const currentConfirmed = this.dataService.getMobilierConfirmationCount(region, mobilierDetail.mobilier);

    // Créer le message avec les détails actuels
    const message = `Type d'équipement: ${mobilierDetail.mobilier}
Total prévu: ${mobilierDetail.planned}
Actuellement confirmés: ${currentConfirmed > 0 ? currentConfirmed : mobilierDetail.delivered}

Veuillez entrer le nombre exact d'équipements reçus pour ce type.`;

    // Ouvrir le dialogue de confirmation standard
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmation de réception d\'équipements',
        message: message,
        showInput: true,
        inputLabel: 'Nombre d\'équipements confirmés',
        commentLabel: 'Commentaire (optionnel)',
        confirmText: 'Confirmer',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.confirmed) {
        try {
          // Convertir la saisie en nombre
          const confirmedCount = parseInt(result.input);

          // Vérifier que le nombre est valide
          if (isNaN(confirmedCount)) {
            this.snackBar.open(
              'Veuillez entrer un nombre valide.',
              'Fermer',
              { duration: 3000 }
            );
            return;
          }

          if (confirmedCount < 0) {
            this.snackBar.open(
              'Le nombre d\'équipements ne peut pas être négatif.',
              'Fermer',
              { duration: 3000 }
            );
            return;
          }

          if (confirmedCount > mobilierDetail.planned) {
            this.snackBar.open(
              `Le nombre d'équipements confirmés (${confirmedCount}) ne peut pas dépasser le total prévu (${mobilierDetail.planned}).`,
              'Fermer',
              { duration: 5000 }
            );
            return;
          }

          // Demander le nom du responsable
          this.promptForResponsible(region, mobilierDetail.mobilier, confirmedCount, result.comment);
        } catch (error) {
          this.snackBar.open(
            'Veuillez entrer un nombre valide.',
            'Fermer',
            { duration: 3000 }
          );
        }
      }
    });
  }

  /**
   * Demande le nom du responsable pour compléter la confirmation
   */
  private promptForResponsible(region: string, mobilierType: string, confirmedCount: number, comment: string = ''): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Identification du responsable',
        message: `Vous allez confirmer la réception de ${confirmedCount} équipement(s) de type "${mobilierType}" dans la région "${region}".

Veuillez indiquer le nom du responsable qui confirme cette réception.`,
        showInput: true,
        inputLabel: 'Nom du responsable',
        confirmText: 'Valider',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.confirmed && result.input) {
        // Effectuer la confirmation
        this.dataService.confirmMobilierType(
          region,
          mobilierType,
          confirmedCount,
          result.input,
          comment
        ).then(() => {
          this.snackBar.open(
            `Confirmation de ${confirmedCount} ${mobilierType}(s) enregistrée avec succès.`,
            'OK',
            { duration: 3000 }
          );

          // Rafraîchir les données
          this.loadData();
        });
      }
    });
  }
  getConfirmedEquipmentsCount(region: string): number {
    const confirmation = this.dataService.getRegionConfirmation(region);
    if (confirmation) {
      return confirmation.equipementsRecus.confirmes;
    }
    return 0;
  }

}
