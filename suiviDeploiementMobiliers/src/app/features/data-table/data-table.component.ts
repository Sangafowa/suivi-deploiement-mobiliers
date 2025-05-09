import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableDataSource } from '@angular/material/table';
import { Subscription } from 'rxjs';

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
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss'
})
export class DataTableComponent implements OnInit, AfterViewInit, OnDestroy {
  dataSource: MatTableDataSource<Delivery>;
  displayedColumns: string[] = ['id', 'region', 'localite', 'typePersonnel', 'nomPersonnel', 'dateLivraison', 'statut', 'actions'];
  regions = ['Toutes', ...REGIONS];
  selectedRegion = 'Toutes';
  totalItems = 0;
  importSuccess = false;
  isLoading = false;
  private subscription: Subscription = new Subscription();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private dataService: DataService) {
    this.dataSource = new MatTableDataSource<Delivery>([]);
  }

  ngOnInit(): void {
    // S'abonner aux changements de données
    this.subscription.add(
      this.dataService.deliveryData$.subscribe(deliveries => {
        this.updateDataSource(deliveries);
      })
    );

    // S'abonner à l'indicateur de chargement
    this.subscription.add(
      this.dataService.isLoading$.subscribe(isLoading => {
        this.isLoading = isLoading;
      })
    );

    // Chargement initial
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Configuration du tri - CORRIGÉ pour respecter les types
    this.dataSource.sortingDataAccessor = (item: Delivery, property: string): string | number => {
      switch(property) {
        case 'dateLivraison':
          return item.dateLivraison ? new Date(item.dateLivraison).getTime() : 0;
        case 'id':
          return typeof item.id === 'string' ? parseInt(item.id) : item.id;
        case 'region':
        case 'localite':
        case 'typePersonnel':
        case 'nomPersonnel':
        case 'statut':
        case 'observation':
          return item[property].toString().toLowerCase();
        default:
          // Pour les propriétés inconnues, retourner une chaîne vide
          return '';
      }
    };
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  updateDataSource(deliveries: Delivery[]): void {
    const filteredData = this.selectedRegion === 'Toutes'
      ? deliveries
      : deliveries.filter(d => d.region === this.selectedRegion);

    this.dataSource.data = filteredData;
    this.totalItems = filteredData.length;

    // Si le paginateur existe déjà, retourner à la première page
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  loadData(): void {
    const deliveries = this.dataService.getDeliveriesByRegion(this.selectedRegion);
    this.updateDataSource(deliveries);
  }

  onRegionChange(): void {
    this.loadData();
  }

  async delete(id: string | number): Promise<void> {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette livraison ?')) {
      await this.dataService.deleteDelivery(id);
      // Pas besoin de recharger manuellement, car on écoute les changements
    }
  }

  edit(delivery: Delivery): void {
    // Stocker l'objet à modifier localement
    localStorage.setItem('editDelivery', JSON.stringify(delivery));
    window.location.href = '/entry'; // redirection vers la saisie
  }

  // Filtre pour rechercher dans toutes les colonnes
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Exporter les données
  exportData(): void {
    this.dataService.exportToJson();
  }

  // Importer des données
  async importData(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('Veuillez sélectionner un fichier JSON valide.');
        return;
      }

      try {
        const success = await this.dataService.importFromJson(file);
        if (success) {
          this.importSuccess = true;
          setTimeout(() => this.importSuccess = false, 3000);
        }
      } catch (error) {
        alert(`Erreur lors de l'importation du fichier: ${error}`);
      } finally {
        // Réinitialiser l'input file
        input.value = '';
      }
    }
  }

  // Effacer toutes les données
  async clearAllData(): Promise<void> {
    if (confirm('Êtes-vous sûr de vouloir effacer TOUTES les données ? Cette action est irréversible.')) {
      await this.dataService.clearAllData();
    }
  }
}
