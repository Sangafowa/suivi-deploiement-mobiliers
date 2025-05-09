import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

// Interface pour typer les données de stock
interface StockData {
  [region: string]: {
    [mobilier: string]: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private stockPath = 'assets/stock_initial_par_region.json';

  // Données de secours extraites de l'Excel
  private fallbackData: StockData = {
    "PORO": {
      "Bureau": 23,
      "Fauteuil": 23,
      "Chaise Visiteur": 46,
      "Chaise Plastique": 92,
      "Armoire": 23,
      "Tableau": 23
    },
    "TCHOLOGO": {
      "Bureau": 9,
      "Fauteuil": 9,
      "Chaise Visiteur": 18,
      "Chaise Plastique": 36,
      "Armoire": 9,
      "Tableau": 9
    },
    "TONKPI": {
      "Bureau": 33,
      "Fauteuil": 33,
      "Chaise Visiteur": 66,
      "Chaise Plastique": 132,
      "Armoire": 33,
      "Tableau": 33
    },
    "WORODOUGOU": {
      "Bureau": 12,
      "Fauteuil": 12,
      "Chaise Visiteur": 24,
      "Chaise Plastique": 48,
      "Armoire": 12,
      "Tableau": 12
    },
    "BAFING": {
      "Bureau": 11,
      "Fauteuil": 11,
      "Chaise Visiteur": 22,
      "Chaise Plastique": 44,
      "Armoire": 11,
      "Tableau": 11
    },
    "GUEMON": {
      "Bureau": 19,
      "Fauteuil": 19,
      "Chaise Visiteur": 38,
      "Chaise Plastique": 76,
      "Armoire": 19,
      "Tableau": 19
    },
    "CAVALLY": {
      "Bureau": 17,
      "Fauteuil": 17,
      "Chaise Visiteur": 34,
      "Chaise Plastique": 68,
      "Armoire": 17,
      "Tableau": 17
    },
    "NAWA": {
      "Bureau": 9,
      "Fauteuil": 9,
      "Chaise Visiteur": 18,
      "Chaise Plastique": 36,
      "Armoire": 9,
      "Tableau": 9
    },
    "AGNEBY-TIASSA": {
      "Bureau": 11,
      "Fauteuil": 11,
      "Chaise Visiteur": 22,
      "Chaise Plastique": 44,
      "Armoire": 11,
      "Tableau": 11
    },
    "LÔH-DJIBOUA": {
      "Bureau": 13,
      "Fauteuil": 13,
      "Chaise Visiteur": 26,
      "Chaise Plastique": 52,
      "Armoire": 13,
      "Tableau": 13
    },
    "MORONOU": {
      "Bureau": 11,
      "Fauteuil": 11,
      "Chaise Visiteur": 22,
      "Chaise Plastique": 44,
      "Armoire": 11,
      "Tableau": 11
    },
    "N'ZI": {
      "Bureau": 6,
      "Fauteuil": 6,
      "Chaise Visiteur": 12,
      "Chaise Plastique": 24,
      "Armoire": 6,
      "Tableau": 6
    },
    "SUD-COMOE": {
      "Bureau": 9,
      "Fauteuil": 9,
      "Chaise Visiteur": 18,
      "Chaise Plastique": 36,
      "Armoire": 9,
      "Tableau": 9
    },
    "INDENIE-DJUABLIN": {
      "Bureau": 9,
      "Fauteuil": 9,
      "Chaise Visiteur": 18,
      "Chaise Plastique": 36,
      "Armoire": 9,
      "Tableau": 9
    },
    "ME": {
      "Bureau": 9,
      "Fauteuil": 9,
      "Chaise Visiteur": 18,
      "Chaise Plastique": 36,
      "Armoire": 9,
      "Tableau": 9
    },
    "GONTOUGO": {
      "Bureau": 17,
      "Fauteuil": 17,
      "Chaise Visiteur": 34,
      "Chaise Plastique": 68,
      "Armoire": 17,
      "Tableau": 17
    }
  };

  constructor(private http: HttpClient) {}

  /**
   * Charge le stock initial des mobiliers par région.
   * Essaie d'abord le fichier JSON, puis utilise des données codées en dur en secours.
   */
  getStockByRegion(): Observable<StockData> {
    console.log('Tentative de chargement du fichier:', this.stockPath);

    return this.http.get<StockData>(this.stockPath)
      .pipe(
        tap(data => console.log('Stock chargé avec succès depuis le fichier:', data)),
        catchError(error => {
          console.error('Erreur lors du chargement du fichier JSON:', error);
          console.log('Utilisation des données de secours codées en dur');

          // En cas d'erreur, utiliser les données de secours
          return of(this.fallbackData);
        })
      );
  }

  /**
   * Transforme les données de stock en les mappant aux types de mobilier attendus
   * @param stockData Données de stock brutes
   * @param mobilierMapping Correspondance entre les noms de mobilier
   */
  transformStockData(
    stockData: StockData,
    mobilierMapping: { [key: string]: string }
  ): StockData {
    const transformedData: StockData = {};

    for (const region of Object.keys(stockData)) {
      transformedData[region] = {};

      for (const oldMobilierName of Object.keys(stockData[region])) {
        const quantity = stockData[region][oldMobilierName];
        const newMobilierName = mobilierMapping[oldMobilierName] || oldMobilierName;

        if (transformedData[region][newMobilierName]) {
          transformedData[region][newMobilierName] += quantity;
        } else {
          transformedData[region][newMobilierName] = quantity;
        }
      }
    }

    return transformedData;
  }
}
