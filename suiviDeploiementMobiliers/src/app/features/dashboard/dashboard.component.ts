import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { DataService } from '../../core/services/data.service';
import { COLORS } from '../../core/constants/app-constants';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { MobilierSummary, PersonnelSummary, RegionSummary } from '../../core/models/summary';
import 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  summaryByRegion: RegionSummary[] = [];
  summaryByPersonnel: PersonnelSummary[] = [];
  summaryByMobilier: MobilierSummary[] = [];
  overallProgress = 0;
  isLoading = false;
  hasInitializedStock = false;
  showInitializeButton = false;

  subscriptions: Subscription[] = [];

  pieChartType: ChartType = 'pie';
  barChartType: ChartType = 'bar';

  pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: true, position: 'bottom' } }
  };

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    },
    plugins: { legend: { display: true, position: 'bottom' } }
  };

  personnelChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: true, position: 'bottom' } }
  };

  pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Livré', 'En attente'],
    datasets: [{ data: [0, 100], backgroundColor: [COLORS[0], '#EEEEEE'] }]
  };

  regionChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Livré', backgroundColor: COLORS[1] },
      { data: [], label: 'En cours', backgroundColor: COLORS[2] }
    ]
  };

  personnelChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Total', backgroundColor: COLORS[4] },
      { data: [], label: 'Livré', backgroundColor: COLORS[1] }
    ]
  };

  mobilierChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Livré', backgroundColor: COLORS[1] },
      { data: [], label: 'En cours', backgroundColor: COLORS[2] }
    ]
  };

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // S'abonner à l'état d'initialisation
    this.subscriptions.push(
      this.dataService.hasInitializedStock$.subscribe(hasInitialized => {
        this.hasInitializedStock = hasInitialized;

        // Si la base de données est vide, on affiche le bouton d'initialisation
        if (!hasInitialized && this.dataService.getDeliveries().length === 0) {
          this.showInitializeButton = true;
        } else {
          this.showInitializeButton = false;
        }
      })
    );

    // S'abonner à l'indicateur de chargement
    this.subscriptions.push(
      this.dataService.isLoading$.subscribe(isLoading => {
        this.isLoading = isLoading;
      })
    );

    // 📈 Souscriptions aux flux de données
    this.subscriptions.push(
      this.dataService.summaryByRegion$.subscribe(data => {
        this.summaryByRegion = data;
        this.updateRegionChart();
      }),
      this.dataService.summaryByPersonnel$.subscribe(data => {
        this.summaryByPersonnel = data;
        this.updatePersonnelChart();
      }),
      this.dataService.summaryByMobilier$.subscribe(data => {
        this.summaryByMobilier = data;
        this.updateMobilierChart();
      }),
      this.dataService.overallProgress$.subscribe(progress => {
        this.overallProgress = progress;
        this.updateProgressChart();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async resetData(): Promise<void> {
    if (confirm('Voulez-vous vraiment réinitialiser les données ? Toutes les livraisons seront effacées.')) {
      await this.dataService.clearAllData();
    }
  }

  initializeStock(): void {
    this.dataService.initializeWithStock();
  }

  private updateProgressChart(): void {
    this.pieChartData = {
      labels: ['Livré', 'En attente'],
      datasets: [{
        data: [this.overallProgress, 100 - this.overallProgress],
        backgroundColor: [COLORS[0], '#EEEEEE']
      }]
    };
  }

  private updateRegionChart(): void {
    this.regionChartData = {
      labels: this.summaryByRegion.map(r => r.name),
      datasets: [
        {
          data: this.summaryByRegion.map(r => r.delivered),
          label: 'Livré',
          backgroundColor: COLORS[1]
        },
        {
          data: this.summaryByRegion.map(r => r.enCours),
          label: 'En cours',
          backgroundColor: COLORS[2]
        }
      ]
    };
  }

  private updatePersonnelChart(): void {
    this.personnelChartData = {
      labels: this.summaryByPersonnel.map(p => p.name),
      datasets: [
        {
          data: this.summaryByPersonnel.map(p => p.total),
          label: 'Total',
          backgroundColor: COLORS[4]
        },
        {
          data: this.summaryByPersonnel.map(p => p.delivered),
          label: 'Livré',
          backgroundColor: COLORS[1]
        }
      ]
    };
  }

  private updateMobilierChart(): void {
    this.mobilierChartData = {
      labels: this.summaryByMobilier.map(m => m.name),
      datasets: [
        {
          data: this.summaryByMobilier.map(m => m.delivered),
          label: 'Livré',
          backgroundColor: COLORS[1]
        },
        {
          data: this.summaryByMobilier.map(m => m.enCours),
          label: 'En cours',
          backgroundColor: COLORS[2]
        }
      ]
    };
  }
}
