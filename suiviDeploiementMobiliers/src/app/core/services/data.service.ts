import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { REGIONS, TYPES_PERSONNEL, TYPES_MOBILIER } from '../constants/app-constants';
import { Delivery } from '../models/delivery';
import { MobilierSummary, PersonnelSummary, RegionSummary } from '../models/summary';

// Définition du type pour totalItemCount
interface TotalItemCount {
  [key: string]: { total: number; delivered: number };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private deliveryData = new BehaviorSubject<Delivery[]>([]);
  private summaryByRegion = new BehaviorSubject<RegionSummary[]>([]);
  private summaryByPersonnel = new BehaviorSubject<PersonnelSummary[]>([]);
  private summaryByMobilier = new BehaviorSubject<MobilierSummary[]>([]);
  private overallProgress = new BehaviorSubject<number>(0);

  // Observables pour les composants
  public deliveryData$ = this.deliveryData.asObservable();
  public summaryByRegion$ = this.summaryByRegion.asObservable();
  public summaryByPersonnel$ = this.summaryByPersonnel.asObservable();
  public summaryByMobilier$ = this.summaryByMobilier.asObservable();
  public overallProgress$ = this.overallProgress.asObservable();

  constructor() {
    this.initializeData();
  }

  // Initialiser les données simulées
  private initializeData(): void {
    // Simulation de données de livraison
    const simulatedDeliveryData: Delivery[] = [];
    const totalItemCount: TotalItemCount = {
      'RR-AFOR': {total: 12*5, delivered: 0},
      'RD-AFOR': {total: 39*5, delivered: 0},
      'CESF': {total: 7*5, delivered: 0},
      'CARTOGRAPHE': {total: 1*5, delivered: 0},
      'INFORMATICIEN': {total: 4*5, delivered: 0}
    };

    // Générer des données aléatoires pour la démonstration
    REGIONS.forEach(region => {
      const deliveryCount = Math.floor(Math.random() * 5);
      for (let i = 0; i < deliveryCount; i++) {
        const personnelType = TYPES_PERSONNEL[Math.floor(Math.random() * TYPES_PERSONNEL.length)];
        const entry: Delivery = {
          id: simulatedDeliveryData.length + 1,
          region,
          localite: `Localité ${i+1}`,
          typePersonnel: personnelType,
          nomPersonnel: `Personnel ${i+1}`,
          dateLivraison: new Date(2025, 4, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
          statut: Math.random() > 0.3 ? 'Livré' : 'En cours',
          mobiliers: {}
        };

        // Ajout des mobiliers aléatoires
        TYPES_MOBILIER.forEach(type => {
          entry.mobiliers[type] = Math.random() > 0.3;
          if (entry.mobiliers[type] && entry.statut === 'Livré') {
            // Vérifier si le type existe dans totalItemCount
            if (totalItemCount[personnelType]) {
              totalItemCount[personnelType].delivered++;
            }
          }
        });

        simulatedDeliveryData.push(entry);
      }
    });

    // Mettre à jour les données
    this.deliveryData.next(simulatedDeliveryData);

    // Calculer les résumés
    this.calculateSummaries(simulatedDeliveryData, totalItemCount);
  }

  // Calculer toutes les statistiques
  private calculateSummaries(data: Delivery[], totalItemCount?: TotalItemCount): void {
    // Si totalItemCount n'est pas fourni, calculer à partir des données
    if (!totalItemCount) {
      totalItemCount = {} as TotalItemCount;
      TYPES_PERSONNEL.forEach(type => {
        totalItemCount![type] = {total: 0, delivered: 0};
      });

      // Compter les mobiliers pour chaque type de personnel
      data.forEach(delivery => {
        const countForType = Object.values(delivery.mobiliers).filter(val => val).length;
        if (totalItemCount![delivery.typePersonnel]) {
          totalItemCount![delivery.typePersonnel].total += countForType;
          if (delivery.statut === 'Livré') {
            totalItemCount![delivery.typePersonnel].delivered += countForType;
          }
        }
      });
    }

    // Calculer le progrès global
    const totalItems = Object.values(totalItemCount).reduce((sum: number, count: any) => sum + count.total, 0);
    const deliveredItems = Object.values(totalItemCount).reduce((sum: number, count: any) => sum + count.delivered, 0);
    const progress = totalItems > 0 ? (deliveredItems / totalItems) * 100 : 0;
    this.overallProgress.next(progress);

    // Préparer les données récapitulatives par région
    const byRegion: RegionSummary[] = REGIONS.map(region => {
      const regionData = data.filter(d => d.region === region);
      const delivered = regionData.filter(d => d.statut === 'Livré').length;
      const total = regionData.length;
      return {
        name: region,
        delivered,
        enCours: total - delivered,
        total
      };
    }).filter(r => r.total > 0);
    this.summaryByRegion.next(byRegion);

    // Préparer les données récapitulatives par type de personnel
    const byPersonnel: PersonnelSummary[] = TYPES_PERSONNEL.map(type => {
      const itemCount = totalItemCount![type] || { total: 0, delivered: 0 };
      return {
        name: type,
        total: itemCount.total,
        delivered: itemCount.delivered,
        percentage: itemCount.total > 0 ?
          (itemCount.delivered / itemCount.total) * 100 : 0
      };
    });
    this.summaryByPersonnel.next(byPersonnel);

    // Préparer les données récapitulatives par type de mobilier
    const byMobilier: MobilierSummary[] = TYPES_MOBILIER.map(type => {
      const deliveredCount = data.filter(d =>
        d.statut === 'Livré' && d.mobiliers[type]
      ).length;
      const totalCount = data.filter(d => d.mobiliers[type]).length;
      return {
        name: type,
        delivered: deliveredCount,
        enCours: totalCount - deliveredCount,
        total: totalCount
      };
    });
    this.summaryByMobilier.next(byMobilier);
  }

  // Ajouter une nouvelle livraison
  addDelivery(delivery: Delivery): void {
    const currentData = this.deliveryData.getValue();
    const newData = [...currentData, {
      ...delivery,
      id: currentData.length + 1
    }];

    this.deliveryData.next(newData);
    this.calculateSummaries(newData);
  }

  // Ajouter plusieurs livraisons (pour l'importation)
  addDeliveries(deliveries: Delivery[]): void {
    const currentData = this.deliveryData.getValue();
    const lastId = currentData.length > 0 ?
      Number(currentData[currentData.length - 1].id) : 0;

    const newDeliveries = deliveries.map((delivery, index) => ({
      ...delivery,
      id: lastId + index + 1
    }));

    const newData = [...currentData, ...newDeliveries];
    this.deliveryData.next(newData);
    this.calculateSummaries(newData);
  }

  // Obtenir toutes les livraisons
  getDeliveries(): Delivery[] {
    return this.deliveryData.getValue();
  }

  // Filtrer les livraisons par région
  getDeliveriesByRegion(region: string): Delivery[] {
    if (region === 'Toutes') {
      return this.getDeliveries();
    }
    return this.getDeliveries().filter(delivery => delivery.region === region);
  }
}
