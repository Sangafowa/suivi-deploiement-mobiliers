import { Injectable } from '@angular/core';
import { BehaviorSubject, from } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import Dexie from 'dexie';
import { Delivery, DeliveryStatus } from '../models/delivery';
import { RegionSummary, PersonnelSummary, MobilierSummary } from '../models/summary';
import { REGIONS, TYPES_MOBILIER, TYPES_PERSONNEL } from '../constants/app-constants';
import { InventoryService } from './inventory.service';

// Définition du type pour totalItemCount
interface TotalItemCount {
  [key: string]: { total: number; delivered: number };
}

// Interface pour les objets de livraison partiels
interface PartialDeliveryInput {
  id?: number | string;
  region?: string;
  localite?: string;
  typePersonnel?: string;
  nomPersonnel?: string;
  dateLivraison?: string;
  statut?: string;
  mobiliers?: { [key: string]: boolean };
  observation?: string;
}

/**
 * Interface pour le résumé des livraisons par région
 */
export interface RegionDeliveryStatus {
  region: string;
  totalPlanned: number;
  totalDelivered: number;
  percentage: number;
  status: 'Non commencé' | 'En cours' | 'Terminé';
  detailsByMobilier: {
    [key: string]: {
      planned: number;
      delivered: number;
      percentage: number;
    }
  };
}

// Définition de la base de données Dexie (IndexedDB)
class DeliveryDatabase extends Dexie {
  deliveries!: Dexie.Table<Delivery, number>;

  constructor() {
    super('DeliveryDatabase');
    this.version(1).stores({
      deliveries: '++id, region, typePersonnel, statut'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private db: DeliveryDatabase;
  private readonly STORAGE_KEY = 'deliveryData';

  private deliveryData = new BehaviorSubject<Delivery[]>([]);
  private summaryByRegion = new BehaviorSubject<RegionSummary[]>([]);
  private summaryByPersonnel = new BehaviorSubject<PersonnelSummary[]>([]);
  private summaryByMobilier = new BehaviorSubject<MobilierSummary[]>([]);
  private overallProgress = new BehaviorSubject<number>(0);
  private isLoading = new BehaviorSubject<boolean>(false);
  private hasInitializedStock = new BehaviorSubject<boolean>(false);

  public deliveryData$ = this.deliveryData.asObservable();
  public summaryByRegion$ = this.summaryByRegion.asObservable();
  public summaryByPersonnel$ = this.summaryByPersonnel.asObservable();
  public summaryByMobilier$ = this.summaryByMobilier.asObservable();
  public overallProgress$ = this.overallProgress.asObservable();
  public isLoading$ = this.isLoading.asObservable();
  public hasInitializedStock$ = this.hasInitializedStock.asObservable();

  constructor(private inventoryService: InventoryService) {
    // Initialiser la base de données Dexie
    this.db = new DeliveryDatabase();

    // Charger les données lors de l'initialisation
    this.loadFromDatabase();
  }

  // Fonction utilitaire pour convertir une chaîne en statut valide
  private ensureValidStatus(status: string): DeliveryStatus {
    if (status === 'Livré' || status === 'Non livré' || status === 'En cours') {
      return status as DeliveryStatus;
    }
    return 'Non livré';
  }

  // Charger les données depuis IndexedDB
  private async loadFromDatabase(): Promise<void> {
    this.isLoading.next(true);
    try {
      const deliveries = await this.db.deliveries.toArray();

      // Valider et corriger les données
      const validData = deliveries.map(item => ({
        ...item,
        statut: this.ensureValidStatus(item.statut),
        mobiliers: item.mobiliers || {}
      }));

      this.deliveryData.next(validData);
      this.calculateSummaries(validData);
      console.log(`Chargé ${validData.length} livraisons depuis IndexedDB.`);

      // Sauvegarder également dans localStorage comme backup
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validData));

      // Vérifier si le stock initial a déjà été chargé
      const hasInitialized = localStorage.getItem('hasInitializedStock') === 'true';
      this.hasInitializedStock.next(hasInitialized);

    } catch (error) {
      console.error('Erreur lors du chargement depuis IndexedDB:', error);
      this.loadFromStorage(); // Fallback vers localStorage
    } finally {
      this.isLoading.next(false);
    }
  }

  // Charger les données depuis localStorage (fallback)
  private loadFromStorage(): void {
    const savedData = localStorage.getItem(this.STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as Delivery[];
        const validData = parsedData.map(item => ({
          ...item,
          statut: this.ensureValidStatus(item.statut),
          mobiliers: item.mobiliers || {}
        }));

        this.deliveryData.next(validData);
        this.calculateSummaries(validData);
        console.log(`Chargé ${validData.length} livraisons depuis le stockage local.`);

        // Synchroniser avec IndexedDB
        this.syncToDatabase(validData);

        // Vérifier si le stock initial a déjà été chargé
        const hasInitialized = localStorage.getItem('hasInitializedStock') === 'true';
        this.hasInitializedStock.next(hasInitialized);

      } catch (error) {
        console.error('Erreur lors du chargement des données locales:', error);
        this.deliveryData.next([]);
        this.hasInitializedStock.next(false);
      }
    } else {
      console.log('Aucune donnée trouvée dans le stockage local.');
      this.deliveryData.next([]);
      this.hasInitializedStock.next(false);
    }
  }

  // Synchroniser les données avec IndexedDB
  private async syncToDatabase(data: Delivery[]): Promise<void> {
    try {
      // Vider la table existante
      await this.db.deliveries.clear();

      // Ajouter les données
      if (data.length > 0) {
        await this.db.deliveries.bulkAdd(data);
      }

      console.log(`${data.length} livraisons synchronisées avec IndexedDB.`);
    } catch (error) {
      console.error('Erreur lors de la synchronisation avec IndexedDB:', error);
    }
  }

  /**
   * Initialise les données avec le stock initial
   * Cette méthode est utilisée pour charger le stock initial depuis l'InventoryService
   */
  initializeWithStock(): void {
    // Vérifier si l'initialisation a déjà été faite
    if (this.hasInitializedStock.getValue()) {
      console.log('Le stock a déjà été initialisé. Pas besoin de réinitialiser.');
      return;
    }

    this.isLoading.next(true);
    console.log('Initialisation avec le stock depuis InventoryService...');

    // Définir le mapping des noms de mobilier
    const mobilierMapping: { [key: string]: string } = {
      'Bureau': 'BUREAU AVEC RETOUR',
      'Fauteuil': 'FAUTEUIL AGENT',
      'Chaise Visiteur': 'CHAISE VISITEUR',
      'Chaise Plastique': 'CHAISE PLASTIQUE',
      'Armoire': 'ARMOIRE DE RANGEMENT',
      'Tableau': 'TABLE DE REUNION'
    };

    // Charger le stock depuis l'InventoryService
    this.inventoryService.getStockByRegion().subscribe({
      next: (stock) => {
        console.log('Stock chargé avec succès:', stock);

        if (!stock || Object.keys(stock).length === 0) {
          console.error('Stock vide ou invalide!');
          this.isLoading.next(false);
          return;
        }

        // Transformer les données de stock selon le mapping
        const transformedStock = this.inventoryService.transformStockData(stock, mobilierMapping);
        console.log('Stock transformé:', transformedStock);

        const deliveryData: Delivery[] = [];
        let itemId = 1;

        // Parcourir chaque région du stock
        for (const region of Object.keys(transformedStock)) {
          const mobiliers = transformedStock[region];

          // Parcourir chaque type de mobilier dans la région
          for (const mobilier of Object.keys(mobiliers)) {
            const quantity = mobiliers[mobilier];

            for (let i = 0; i < quantity; i++) {
              // Créer un objet mobiliers avec tous les types à false
              const mobilierMap: Record<string, boolean> = {};
              TYPES_MOBILIER.forEach(type => {
                mobilierMap[type] = type === mobilier;
              });

              // Assigner un type de personnel de manière répartie
              const typePersonnelIndex = itemId % TYPES_PERSONNEL.length;
              const typePersonnel = TYPES_PERSONNEL[typePersonnelIndex];

              // Tous les éléments sont initialement "Non livré"
              deliveryData.push({
                id: itemId++,
                region,
                localite: `Localité ${i + 1}`,
                typePersonnel,
                nomPersonnel: `Agent ${i + 1} - ${typePersonnel}`,
                dateLivraison: '', // Pas de date de livraison initialement
                statut: 'Non livré', // Tous les éléments sont "Non livré"
                mobiliers: mobilierMap,
                observation: ''
              });
            }
          }
        }

        console.log(`${deliveryData.length} éléments de livraison créés, tous en statut "Non livré".`);

        // Enregistrer dans la base de données
        this.syncToDatabase(deliveryData).then(() => {
          // Mettre à jour les observables
          this.deliveryData.next(deliveryData);
          this.calculateSummaries(deliveryData);

          // Sauvegarder dans le localStorage
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(deliveryData));

          // Marquer le stock comme initialisé
          localStorage.setItem('hasInitializedStock', 'true');
          this.hasInitializedStock.next(true);

          console.log('Données de livraison initialisées avec succès.');
          this.isLoading.next(false);
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement du stock:', error);
        this.isLoading.next(false);
      }
    });
  }

  /**
   * Initialise les données avec un tableau vide
   */
  async initializeWithEmptyData(): Promise<void> {
    this.isLoading.next(true);
    console.log('Initialisation avec un tableau vide...');

    try {
      // Vider la base de données
      await this.db.deliveries.clear();

      // Vider le localStorage
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('hasInitializedStock');

      // Réinitialiser les observables
      this.deliveryData.next([]);
      this.calculateSummaries([]);
      this.hasInitializedStock.next(false);

      console.log('Données effacées avec succès.');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des données:', error);
    } finally {
      this.isLoading.next(false);
    }
  }

  // === Méthodes CRUD ===

  /**
   * Ajoute une nouvelle livraison
   */
  async addDelivery(deliveryInput: PartialDeliveryInput): Promise<void> {
    this.isLoading.next(true);
    const current = this.deliveryData.getValue();

    try {
      // Construire une livraison valide
      const newDelivery: Omit<Delivery, 'id'> = {
        region: deliveryInput.region || '',
        localite: deliveryInput.localite || '',
        typePersonnel: deliveryInput.typePersonnel || '',
        nomPersonnel: deliveryInput.nomPersonnel || '',
        dateLivraison: deliveryInput.dateLivraison || '',
        statut: this.ensureValidStatus(deliveryInput.statut || 'Livré'),
        mobiliers: deliveryInput.mobiliers || {},
        observation: deliveryInput.observation || ''
      };

      // Ajouter à la base de données (l'ID sera généré automatiquement)
      const id = await this.db.deliveries.add(newDelivery as any);

      // Récupérer la livraison complète avec son ID
      const addedDelivery = await this.db.deliveries.get(id as number);

      if (addedDelivery) {
        // Mettre à jour les données locales
        const updated = [...current, addedDelivery];
        this.deliveryData.next(updated);
        this.calculateSummaries(updated);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));

        console.log(`Livraison ajoutée avec ID ${addedDelivery.id}:`, addedDelivery);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la livraison:', error);
    } finally {
      this.isLoading.next(false);
    }
  }

  /**
   * Met à jour une livraison existante
   */
  async updateDelivery(updatedInput: PartialDeliveryInput): Promise<void> {
    if (!updatedInput.id) {
      console.error('Tentative de mise à jour d\'une livraison sans ID');
      return;
    }

    this.isLoading.next(true);
    const current = this.deliveryData.getValue();

    try {
      // S'assurer que la livraison existe
      const existing = current.find(d => d.id === updatedInput.id);
      if (!existing) {
        console.error(`Tentative de mise à jour d'une livraison inexistante avec ID ${updatedInput.id}`);
        this.isLoading.next(false);
        return;
      }

      // Créer une version mise à jour de la livraison
      const updated: Delivery = {
        ...existing,
        region: updatedInput.region || existing.region,
        localite: updatedInput.localite || existing.localite,
        typePersonnel: updatedInput.typePersonnel || existing.typePersonnel,
        nomPersonnel: updatedInput.nomPersonnel || existing.nomPersonnel,
        dateLivraison: updatedInput.dateLivraison || existing.dateLivraison,
        statut: this.ensureValidStatus(updatedInput.statut || existing.statut),
        mobiliers: updatedInput.mobiliers || existing.mobiliers,
        observation: updatedInput.observation !== undefined ? updatedInput.observation : existing.observation
      };

      // Mettre à jour dans la base de données
      const id = Number(updated.id);
      const changes = {
        region: updated.region,
        localite: updated.localite,
        typePersonnel: updated.typePersonnel,
        nomPersonnel: updated.nomPersonnel,
        dateLivraison: updated.dateLivraison,
        statut: updated.statut,
        mobiliers: updated.mobiliers,
        observation: updated.observation
      };

      await this.db.deliveries.update(id, changes);

      // Mettre à jour les données locales
      const updatedList = current.map(d => d.id === updated.id ? updated : d);
      this.deliveryData.next(updatedList);
      this.calculateSummaries(updatedList);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedList));

      console.log(`Livraison mise à jour avec ID ${updated.id}:`, updated);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la livraison:', error);
    } finally {
      this.isLoading.next(false);
    }
  }

  /**
   * Supprime une livraison
   */
  async deleteDelivery(id: number | string): Promise<void> {
    this.isLoading.next(true);
    const current = this.deliveryData.getValue();

    try {
      // Supprimer de la base de données
      await this.db.deliveries.delete(Number(id));

      // Mettre à jour les données locales
      const updated = current.filter(d => d.id !== id);
      this.deliveryData.next(updated);
      this.calculateSummaries(updated);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));

      console.log(`Livraison supprimée avec ID ${id}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de la livraison:', error);
    } finally {
      this.isLoading.next(false);
    }
  }

  /**
   * Récupère toutes les livraisons
   */
  getDeliveries(): Delivery[] {
    return this.deliveryData.getValue();
  }

  /**
   * Récupère les livraisons filtrées par région
   */
  getDeliveriesByRegion(region: string): Delivery[] {
    if (region === 'Toutes') return this.getDeliveries();
    return this.getDeliveries().filter(d => d.region === region);
  }

  /**
   * Calcule les différents résumés pour les graphiques
   */
  private calculateSummaries(data: Delivery[]): void {
    // Initialiser les compteurs pour chaque type de personnel
    const totalItemCount: TotalItemCount = {};
    TYPES_PERSONNEL.forEach(type => totalItemCount[type] = { total: 0, delivered: 0 });

    // Compter les éléments par type de personnel
    data.forEach(d => {
      // Compter le nombre de mobiliers sélectionnés
      const mobilierCount = Object.values(d.mobiliers).filter(v => v).length;

      if (d.typePersonnel && totalItemCount[d.typePersonnel]) {
        totalItemCount[d.typePersonnel].total += mobilierCount;

        if (d.statut === 'Livré') {
          totalItemCount[d.typePersonnel].delivered += mobilierCount;
        }
      }
    });

    // Progression globale
    const total = Object.values(totalItemCount).reduce((sum, c) => sum + c.total, 0);
    const done = Object.values(totalItemCount).reduce((sum, c) => sum + c.delivered, 0);
    const progress = total > 0 ? (done / total) * 100 : 0;
    this.overallProgress.next(progress);

    // Résumé par région
    const byRegion = REGIONS
      .filter(r => r !== 'Toutes')
      .map(r => {
        const filtered = data.filter(d => d.region === r);
        const livrées = filtered.filter(d => d.statut === 'Livré').length;
        return {
          name: r,
          total: filtered.length,
          delivered: livrées,
          enCours: filtered.length - livrées
        };
      }).filter(r => r.total > 0);

    this.summaryByRegion.next(byRegion);

    // Résumé par type de personnel
    const byPersonnel = TYPES_PERSONNEL.map(type => {
      const t = totalItemCount[type];
      return {
        name: type,
        total: t.total,
        delivered: t.delivered,
        percentage: t.total ? (t.delivered / t.total) * 100 : 0
      };
    });

    this.summaryByPersonnel.next(byPersonnel);

    // Résumé par type de mobilier
    const byMobilier = TYPES_MOBILIER.map(type => {
      // Compter les éléments qui ont ce type de mobilier
      const total = data.filter(d => d.mobiliers[type]).length;
      const done = data.filter(d => d.mobiliers[type] && d.statut === 'Livré').length;
      return {
        name: type,
        total,
        delivered: done,
        enCours: total - done
      };
    });

    this.summaryByMobilier.next(byMobilier);
  }

  /**
   * Ajoute plusieurs livraisons d'un coup
   */
  async addDeliveries(deliveriesInput: PartialDeliveryInput[]): Promise<void> {
    if (deliveriesInput.length === 0) return;

    this.isLoading.next(true);
    const currentData = this.deliveryData.getValue();

    try {
      // Préparer les livraisons à ajouter (sans ID, ils seront générés automatiquement)
      const newDeliveries = deliveriesInput.map(input => ({
        region: input.region || '',
        localite: input.localite || '',
        typePersonnel: input.typePersonnel || '',
        nomPersonnel: input.nomPersonnel || '',
        dateLivraison: input.dateLivraison || '',
        statut: this.ensureValidStatus(input.statut || 'Non livré'),
        mobiliers: input.mobiliers || {},
        observation: input.observation || ''
      }));

      // Ajouter en masse à la base de données
      const ids = await this.db.deliveries.bulkAdd(newDeliveries as any[], { allKeys: true });

      // Récupérer les livraisons complètes avec leurs IDs
      const addedDeliveries: Delivery[] = [];
      for (const id of ids) {
        const delivery = await this.db.deliveries.get(id as number);
        if (delivery) {
          addedDeliveries.push(delivery);
        }
      }

      // Mettre à jour les données locales
      const updated = [...currentData, ...addedDeliveries];
      this.deliveryData.next(updated);
      this.calculateSummaries(updated);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));

      console.log(`${addedDeliveries.length} livraisons ajoutées en masse.`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout en masse de livraisons:', error);
    } finally {
      this.isLoading.next(false);
    }
  }

  /**
   * Marque une livraison comme livrée
   */
  async markAsDelivered(id: number | string, observation: string = ''): Promise<void> {
    const current = this.deliveryData.getValue();
    const delivery = current.find(d => d.id === id);

    if (!delivery) {
      console.error(`Livraison avec ID ${id} non trouvée`);
      return;
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Créer l'objet mise à jour
    const updatedDelivery: Delivery = {
      ...delivery,
      statut: 'Livré',
      dateLivraison: dateStr,
      observation: observation || delivery.observation || 'Livraison effectuée'
    };

    // Utiliser la méthode de mise à jour existante
    await this.updateDelivery(updatedDelivery);
  }

  /**
   * Efface toutes les données
   */
  async clearAllData(): Promise<void> {
    this.isLoading.next(true);

    try {
      // Vider la base de données
      await this.db.deliveries.clear();

      // Vider le localStorage
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem('hasInitializedStock');

      // Réinitialiser les observables
      this.deliveryData.next([]);
      this.calculateSummaries([]);
      this.hasInitializedStock.next(false);

      console.log('Toutes les données ont été effacées.');
    } catch (error) {
      console.error('Erreur lors de l\'effacement des données:', error);
    } finally {
      this.isLoading.next(false);
    }
  }

  /**
   * Exporte les données sous forme de fichier JSON
   */
  exportToJson(): void {
    const data = this.deliveryData.getValue();
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'livraisons_export.json';
    document.body.appendChild(a);
    a.click();

    // Nettoyer
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Importe des données depuis un fichier JSON
   */
  async importFromJson(file: File): Promise<boolean> {
    this.isLoading.next(true);

    return new Promise<boolean>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content) as Delivery[];

          // Valider les données
          const validData = data.map(item => ({
            ...item,
            statut: this.ensureValidStatus(item.statut),
            mobiliers: item.mobiliers || {}
          }));

          // Nettoyer la base de données
          await this.db.deliveries.clear();

          // Ajouter les nouvelles données
          await this.db.deliveries.bulkAdd(validData);

          // Recharger les données
          await this.loadFromDatabase();

          // Marquer comme initialisé
          localStorage.setItem('hasInitializedStock', 'true');
          this.hasInitializedStock.next(true);

          resolve(true);
        } catch (error) {
          console.error('Erreur lors de l\'importation du fichier JSON:', error);
          reject(error);
        } finally {
          this.isLoading.next(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Erreur lors de la lecture du fichier:', error);
        this.isLoading.next(false);
        reject(error);
      };

      reader.readAsText(file);
    });
  }

  /**
   * Récupère le statut des livraisons par région, en comparant avec le stock initial
   * @param region Région optionnelle pour filtrer les résultats
   * @returns Tableau de statuts par région
   */
  getRegionDeliveryStatus(region?: string): RegionDeliveryStatus[] {
    // Obtenir les données de livraison
    const deliveries = this.getDeliveries();
    // Résultat à retourner
    const result: RegionDeliveryStatus[] = [];

    // Définir le mapping des noms de mobilier
    const mobilierMapping: { [key: string]: string } = {
      'Bureau': 'BUREAU AVEC RETOUR',
      'Fauteuil': 'FAUTEUIL AGENT',
      'Chaise Visiteur': 'CHAISE VISITEUR',
      'Chaise Plastique': 'CHAISE PLASTIQUE',
      'Armoire': 'ARMOIRE DE RANGEMENT',
      'Tableau': 'TABLE DE REUNION'
    };

    // Charger les données de stock - version synchrone par récupération en mémoire
    // Dans une implémentation réelle on utiliserait getStockByRegion().pipe(first()).toPromise()
    this.inventoryService.getStockByRegion().subscribe(stockData => {
      if (!stockData) return;

      // Transformer les données de stock selon le mapping
      const transformedStock = this.inventoryService.transformStockData(stockData, mobilierMapping);

      // Pour chaque région dans le stock
      for (const regionName of Object.keys(transformedStock)) {
        // Filtrer par région si spécifié
        if (region && regionName !== region) continue;

        const regionMobiliers = transformedStock[regionName];
        let totalPlanned = 0;
        let totalDelivered = 0;

        // Initialiser les détails par type de mobilier
        const detailsByMobilier: {[key: string]: {planned: number; delivered: number; percentage: number}} = {};

        // Parcourir chaque type de mobilier dans la région
        for (const mobilierType of Object.keys(regionMobiliers)) {
          const planned = regionMobiliers[mobilierType];
          totalPlanned += planned;

          // Initialiser les compteurs pour ce type de mobilier
          detailsByMobilier[mobilierType] = {
            planned,
            delivered: 0,
            percentage: 0
          };
        }

        // Compter les livraisons effectuées pour cette région
        const regionDeliveries = deliveries.filter(d => d.region === regionName && d.statut === 'Livré');

        // Pour chaque livraison dans cette région
        for (const delivery of regionDeliveries) {
          // Pour chaque type de mobilier dans cette livraison
          for (const mobilierType of Object.keys(delivery.mobiliers)) {
            if (delivery.mobiliers[mobilierType]) {
              totalDelivered++;

              // Si ce type de mobilier existe dans les détails, incrémenter le compteur
              if (detailsByMobilier[mobilierType]) {
                detailsByMobilier[mobilierType].delivered++;
              }
            }
          }
        }

        // Calculer les pourcentages
        for (const mobilierType of Object.keys(detailsByMobilier)) {
          const detail = detailsByMobilier[mobilierType];
          detail.percentage = detail.planned > 0 ? Math.round((detail.delivered / detail.planned) * 100) : 0;
        }

        // Calculer le pourcentage global
        const percentage = totalPlanned > 0 ? Math.round((totalDelivered / totalPlanned) * 100) : 0;

        // Déterminer le statut
        let status: 'Non commencé' | 'En cours' | 'Terminé' = 'Non commencé';
        if (percentage === 100) {
          status = 'Terminé';
        } else if (percentage > 0) {
          status = 'En cours';
        }

        // Ajouter au résultat
        result.push({
          region: regionName,
          totalPlanned,
          totalDelivered,
          percentage,
          status,
          detailsByMobilier
        });
      }
    });

    return result;
  }

  /**
   * Exporte un rapport CSV des livraisons pour une région spécifique
   * @param region Nom de la région
   */
  exportRegionReport(region: string): void {
    const deliveries = this.getDeliveriesByRegion(region);

    if (deliveries.length === 0) {
      console.warn(`Aucune livraison trouvée pour la région ${region}`);
      return;
    }

    // Créer le contenu CSV
    let csvContent = 'ID,Localité,Type Personnel,Nom Personnel,Date Livraison,Statut,Mobiliers,Observation\n';

    deliveries.forEach(delivery => {
      // Créer une liste des mobiliers
      const mobiliers = Object.keys(delivery.mobiliers)
        .filter(key => delivery.mobiliers[key])
        .join(', ');

      // Échapper les virgules dans les champs de texte
      const escapeCsv = (text: string) => `"${text.replace(/"/g, '""')}"`;

      csvContent += [
        delivery.id,
        escapeCsv(delivery.localite),
        escapeCsv(delivery.typePersonnel),
        escapeCsv(delivery.nomPersonnel),
        delivery.dateLivraison,
        delivery.statut,
        escapeCsv(mobiliers),
        escapeCsv(delivery.observation)
      ].join(',') + '\n';
    });

    // Télécharger le fichier CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_${region}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
