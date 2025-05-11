import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { DataService } from '../../core/services/data.service';
import { RegionConfirmation } from '../../core/models/delivery';
import { REGIONS, TYPES_MOBILIER } from '../../core/constants/app-constants';
import { ConfirmationDialogComponent, ConfirmationDialogResult } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-region-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  templateUrl: './region-confirmation.component.html',
  styleUrls: ['./region-confirmation.component.scss']
})
export class RegionConfirmationComponent implements OnInit {
  confirmationForm: FormGroup;
  regions = REGIONS.filter(r => r !== 'Toutes');
  selectedRegion: string = '';
  confirmation: RegionConfirmation | null = null;
  isLoading = false;
  displayedColumns: string[] = ['type', 'total', 'confirmes', 'pourcentage', 'actions'];
  equipementDetails: { type: string; total: number; confirmes: number; pourcentage: number }[] = [];

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.confirmationForm = this.fb.group({
      region: ['', Validators.required],
      responsable: ['', Validators.required],
      commentaire: ['']
    });
  }

  ngOnInit(): void {
    this.dataService.isLoading$.subscribe(loading => {
      this.isLoading = loading;
    });

    this.confirmationForm.get('region')?.valueChanges.subscribe(region => {
      if (region) {
        this.selectedRegion = region;

        // Vider les champs Responsable et Commentaire
        this.confirmationForm.patchValue({
          responsable: '',
          commentaire: ''
        });

        this.loadRegionData(region);
      } else {
        this.selectedRegion = '';
        this.confirmation = null;
        this.equipementDetails = [];
      }
    });

  }

  loadRegionData(region: string): void {
    const existing = this.dataService.getRegionConfirmation(region);

    if (existing) {
      this.confirmation = existing;
      this.confirmationForm.patchValue({
        responsable: existing.responsable,
        commentaire: existing.commentaire
      });
      this.equipementDetails = this.transformDetailsToArray(existing.equipementsRecus.detailsParType);
    } else {
      this.confirmation = this.dataService.generateRegionConfirmation(
        region,
        this.confirmationForm.get('responsable')?.value || '',
        this.confirmationForm.get('commentaire')?.value || ''
      );
      this.equipementDetails = this.transformDetailsToArray(this.confirmation.equipementsRecus.detailsParType);
    }
  }

  transformDetailsToArray(details: { [type: string]: { total: number; confirmes: number } }): any[] {
    return Object.entries(details)
      .filter(([_, values]) => values.total > 0)
      .map(([type, values]) => ({
        type,
        total: values.total,
        confirmes: values.confirmes,
        pourcentage: values.total > 0 ? Math.round((values.confirmes / values.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 100) return 'primary';
    if (percentage >= 50) return 'accent';
    return 'warn';
  }

  confirmAll(): void {
    if (!this.selectedRegion || !this.confirmationForm.valid) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', {
        duration: 3000
      });
      return;
    }

    const { region, responsable, commentaire } = this.confirmationForm.value;

    const confirmation: RegionConfirmation = {
      region,
      responsable,
      dateConfirmation: new Date().toISOString().split('T')[0],
      commentaire: commentaire || '',
      statut: 'Confirmé',
      equipementsRecus: {
        total: this.confirmation?.equipementsRecus.total || 0,
        confirmes: this.confirmation?.equipementsRecus.total || 0,
        pourcentage: 100,
        detailsParType: {}
      },
      confirmedItems: []
    };

    if (this.confirmation) {
      confirmation.equipementsRecus.detailsParType = { ...this.confirmation.equipementsRecus.detailsParType };

      Object.keys(confirmation.equipementsRecus.detailsParType).forEach(type => {
        const total = confirmation.equipementsRecus.detailsParType[type].total;
        confirmation.equipementsRecus.detailsParType[type].confirmes = total;
      });
    }

    this.dataService.updateRegionConfirmation(confirmation).then(() => {
      this.snackBar.open(`Confirmation réussie pour la région ${region}`, 'OK', {
        duration: 3000
      });
      this.loadRegionData(region);
    });
  }

  saveConfirmation(): void {
    if (!this.selectedRegion || !this.confirmationForm.valid) {
      this.snackBar.open('Veuillez remplir tous les champs obligatoires', 'Fermer', {
        duration: 3000
      });
      return;
    }

    const { region, responsable, commentaire } = this.confirmationForm.value;

    if (!this.confirmation) {
      this.confirmation = this.dataService.generateRegionConfirmation(
        region, responsable, commentaire
      );
    } else {
      this.confirmation.responsable = responsable;
      this.confirmation.commentaire = commentaire || '';
      this.confirmation.dateConfirmation = new Date().toISOString().split('T')[0];
    }

    this.dataService.updateRegionConfirmation(this.confirmation).then(() => {
      this.snackBar.open(`Données de confirmation sauvegardées pour la région ${region}`, 'OK', {
        duration: 3000
      });
      this.loadRegionData(region);
    });
  }

  resetForm(): void {
    if (!this.selectedRegion) {
      this.confirmationForm.reset();
      this.confirmation = null;
      this.equipementDetails = [];
      return;
    }

    // Remettre à zéro tous les types d'équipements confirmés
    if (this.confirmation) {
      Object.keys(this.confirmation.equipementsRecus.detailsParType).forEach(type => {
        this.dataService.confirmMobilierType(
          this.selectedRegion,
          type,
          0,
          this.confirmationForm.get('responsable')?.value || 'Responsable inconnu',
          'Réinitialisation complète'
        );
      });

      this.snackBar.open('Tous les équipements ont été réinitialisés.', 'OK', {
        duration: 3000
      });
    }

    // Réinitialiser le formulaire
    this.confirmationForm.reset();
    this.confirmation = null;
    this.equipementDetails = [];
  }


  openEquipmentConfirmation(item: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmation de réception d\'équipement',
        message: `Type d'équipement: ${item.type}
Total prévu: ${item.total}
Déjà confirmé: ${item.confirmes}

Veuillez entrer le nombre exact d'équipements reçus.`,
        showInput: true,
        inputLabel: 'Nombre reçu',
        commentLabel: 'Commentaire (optionnel)',
        confirmText: 'Confirmer',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe((result: ConfirmationDialogResult) => {
      if (result && result.confirmed) {
        const confirmedCount = parseInt(result.input ?? '0');

        if (isNaN(confirmedCount) || confirmedCount < 0 || confirmedCount > item.total) {
          this.snackBar.open(
            'Veuillez entrer un nombre valide (entre 0 et ' + item.total + ').',
            'Fermer',
            { duration: 4000 }
          );
          return;
        }

        this.promptForResponsible(item.type, item.total, confirmedCount, result.comment);
      }
    });
  }


  promptForResponsible(mobilierType: string, total: number, confirmedCount: number, comment: string = ''): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Nom du Responsable',
        message: `Veuillez entrer le nom du responsable pour confirmer ${confirmedCount} équipements de type ${mobilierType}.`,
        showInput: true,
        inputLabel: 'Nom du responsable',
        confirmText: 'Valider',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe((result: ConfirmationDialogResult) => {
      if (result && result.confirmed && result.input) {
        this.dataService.confirmMobilierType(
          this.selectedRegion,
          mobilierType,
          confirmedCount,
          result.input,
          comment
        ).then(() => {
          this.snackBar.open(
            `Confirmation enregistrée avec succès pour ${mobilierType} (${confirmedCount}/${total}).`,
            'OK',
            { duration: 3000 }
          );

          this.loadRegionData(this.selectedRegion);
        });
      }
    });
  }
  resetEquipment(item: any): void {
    if (!this.selectedRegion) return;

    this.dataService.confirmMobilierType(
      this.selectedRegion,
      item.type,
      0, // Remettre le nombre confirmé à 0
      this.confirmationForm.get('responsable')?.value || 'Responsable inconnu',
      'Réinitialisation manuelle'
    ).then(() => {
      this.snackBar.open(`Le mobilier "${item.type}" a été réinitialisé.`, 'OK', {
        duration: 3000
      });
      this.loadRegionData(this.selectedRegion);
    });
  }


}
