import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { REGIONS, TYPES_MOBILIER, TYPES_PERSONNEL } from '../../core/constants/app-constants';
import { DataService } from '../../core/services/data.service';
import { Delivery } from '../../core/models/delivery';
import { MatCard, MatCardContent, MatCardHeader, MatCardModule } from '@angular/material/card';
import { MatFormField, MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { formatDate } from '@angular/common';

// Format de date personnalisé (JJ/MM/AAAA)
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'dd/MM/yyyy',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-manual-entry',
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    ReactiveFormsModule,
    MatFormField,
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' }, // Locale française
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS } // Format personnalisé
  ],
  templateUrl: './manual-entry.component.html',
  styleUrl: './manual-entry.component.scss'
})
export class ManualEntryComponent implements OnInit {
  entryForm!: FormGroup;
  regions = REGIONS;
  typesPersonnel = TYPES_PERSONNEL;
  typesMobilier = TYPES_MOBILIER;
  submitting = false;
  success = false;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private dateAdapter: DateAdapter<any>
  ) {
    this.dateAdapter.setLocale('fr-FR');
  }

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    // Créer les contrôles pour les mobiliers
    const mobilierControls: {[key: string]: boolean} = {};
    this.typesMobilier.forEach(type => {
      mobilierControls[type] = false;
    });

    this.entryForm = this.fb.group({
      region: ['', Validators.required],
      localite: [''],
      typePersonnel: ['', Validators.required],
      nomPersonnel: [''],
      dateLivraison: [new Date(), Validators.required],
      observation: [''],
      mobiliers: this.fb.group(mobilierControls)
    });
  }

  onSubmit(): void {
    if (this.entryForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.entryForm.controls).forEach(key => {
        const control = this.entryForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;

    const formValue = this.entryForm.value;

    // Utiliser la fonction formatDate pour le format d'affichage (JJ/MM/AAAA)
    // mais garder le format ISO pour le stockage
    let dateLivraison = '';
    const date = formValue.dateLivraison;

    if (date instanceof Date) {
      // Format pour l'affichage
      const displayDate = this.formatDate(date);
      console.log(`Date formatée pour l'affichage: ${displayDate}`);

      // Format pour stockage (YYYY-MM-DD)
      dateLivraison = date.toISOString().split('T')[0];
    } else {
      dateLivraison = formValue.dateLivraison;
    }

    const newDelivery: Delivery = {
      id: 0, // ID sera défini par le service
      region: formValue.region,
      localite: formValue.localite || '',
      typePersonnel: formValue.typePersonnel,
      nomPersonnel: formValue.nomPersonnel || '',
      dateLivraison: dateLivraison, // Format ISO pour le stockage
      statut: 'Livré',
      mobiliers: formValue.mobiliers,
      observation: formValue.observation
    };

    // Ajouter la livraison
    this.dataService.addDelivery(newDelivery);

    // Réinitialiser le formulaire
    this.entryForm.reset();
    this.initForm();
    this.success = true;

    // Cacher le message de succès après un délai
    setTimeout(() => {
      this.success = false;
      this.submitting = false;
    }, 3000);
  }

  // Formater la date pour l'affichage (JJ/MM/AAAA)
  formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 car les mois commencent à 0
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
