// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';

import { DataService } from '../../core/services/data.service';
import { COLORS } from '../../core/constants/app-constants';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import {MobilierSummary, PersonnelSummary, RegionSummary} from '../../core/models/summary';
import 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    BaseChartDirective
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Données de résumé
  summaryByRegion: RegionSummary[] = [];
  summaryByPersonnel: PersonnelSummary[] = [];
  summaryByMobilier: MobilierSummary[] = [];
  overallProgress: number = 0;

  // Souscriptions
  private subscriptions: Subscription[] = [];

  // Configuration des graphiques
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      }
    }
  };

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: {
        stacked: true
      },
      y: {
        stacked: true
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      }
    }
  };

  public personnelChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
      }
    }
  };

  // Données de graphiques
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Livré', 'En attente'],
    datasets: [{
      data: [0, 100],
      backgroundColor: [COLORS[0], '#EEEEEE']
    }]
  };

  public regionChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Livré', backgroundColor: COLORS[1] },
      { data: [], label: 'En cours', backgroundColor: COLORS[2] }
    ]
  };

  public personnelChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Total', backgroundColor: COLORS[4] },
      { data: [], label: 'Livré', backgroundColor: COLORS[1] }
    ]
  };

  public mobilierChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Livré', backgroundColor: COLORS[1] },
      { data: [], label: 'En cours', backgroundColor: COLORS[2] }
    ]
  };

  // Types de graphiques
  public pieChartType: ChartType = 'pie';
  public barChartType: ChartType = 'bar';

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // Souscrire aux changements de données
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
    // Désabonner de toutes les souscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
    const labels = this.summaryByRegion.map(item => item.name);
    const deliveredData = this.summaryByRegion.map(item => item.delivered);
    const enCoursData = this.summaryByRegion.map(item => item.enCours);

    this.regionChartData = {
      labels,
      datasets: [
        { data: deliveredData, label: 'Livré', backgroundColor: COLORS[1] },
        { data: enCoursData, label: 'En cours', backgroundColor: COLORS[2] }
      ]
    };
  }

  private updatePersonnelChart(): void {
    const labels = this.summaryByPersonnel.map(item => item.name);
    const totalData = this.summaryByPersonnel.map(item => item.total);
    const deliveredData = this.summaryByPersonnel.map(item => item.delivered);

    this.personnelChartData = {
      labels,
      datasets: [
        { data: totalData, label: 'Total', backgroundColor: COLORS[4] },
        { data: deliveredData, label: 'Livré', backgroundColor: COLORS[1] }
      ]
    };
  }

  private updateMobilierChart(): void {
    const labels = this.summaryByMobilier.map(item => item.name);
    const deliveredData = this.summaryByMobilier.map(item => item.delivered);
    const enCoursData = this.summaryByMobilier.map(item => item.enCours);

    this.mobilierChartData = {
      labels,
      datasets: [
        { data: deliveredData, label: 'Livré', backgroundColor: COLORS[1] },
        { data: enCoursData, label: 'En cours', backgroundColor: COLORS[2] }
      ]
    };
  }
}
