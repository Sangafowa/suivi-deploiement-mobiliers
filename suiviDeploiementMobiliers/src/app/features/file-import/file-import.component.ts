import { Component } from '@angular/core';
import {DataService} from '../../core/services/data.service';
import {Delivery} from '../../core/models/delivery';
import {REGIONS, TYPES_MOBILIER, TYPES_PERSONNEL} from '../../core/constants/app-constants';
import {MatCard, MatCardContent, MatCardHeader, MatCardModule} from '@angular/material/card';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatListModule} from '@angular/material/list';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-file-import',
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatIcon,
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    FormsModule
  ],
  templateUrl: './file-import.component.html',
  styleUrl: './file-import.component.scss'
})
export class FileImportComponent {
  files: File[] = [];
  processing = false;
  error: string | null = null;
  success = false;

  constructor(private dataService: DataService) {}

  handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.error = null;
      this.success = false;
      this.files = Array.from(input.files);
    }
  }

  removeFile(index: number): void {
    this.files = this.files.filter((_, i) => i !== index);
  }

  processFiles(): void {
    if (this.files.length === 0) {
      this.error = "Aucun fichier à traiter";
      return;
    }

    this.processing = true;
    this.error = null;

    // Dans une application réelle, nous utiliserions un service pour traiter les fichiers Excel
    // Ici, nous simulerons le traitement pour la démo
    setTimeout(() => {
      try {
        // Simuler des données traitées
        const processedData: Delivery[] = [];
        for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
          const entry: Delivery = {
            id: `AUTO-${Date.now()}-${i}`,
            region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
            localite: `Localité ${i+1}`,
            typePersonnel: TYPES_PERSONNEL[Math.floor(Math.random() * TYPES_PERSONNEL.length)],
            nomPersonnel: `Personnel ${i+1}`,
            dateLivraison: new Date(2025, 4, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
            statut: Math.random() > 0.3 ? 'Livré' : 'En cours',
            mobiliers: {}
          };

          TYPES_MOBILIER.forEach(type => {
            entry.mobiliers[type] = Math.random() > 0.3;
          });

          processedData.push(entry);
        }

        this.dataService.addDeliveries(processedData);
        this.success = true;
      } catch (err: any) {
        this.error = `Erreur lors du traitement: ${err?.message || 'Erreur inconnue'}`;
      } finally {
        this.processing = false;
      }
    }, 1500);
  }

  handleCancel(): void {
    this.files = [];
    this.error = null;
    this.success = false;
  }

  downloadExcelTemplate(): void {
    alert("Cette fonctionnalité téléchargerait normalement le modèle Excel");
  }
}
