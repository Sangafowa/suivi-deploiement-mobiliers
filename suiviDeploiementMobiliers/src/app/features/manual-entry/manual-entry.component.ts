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
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }
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
  editingId: string | number | null = null;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private dateAdapter: DateAdapter<any>
  ) {
    this.dateAdapter.setLocale('fr-FR');
  }

  ngOnInit(): void {
    this.initForm();

    const saved = localStorage.getItem('editDelivery');
    if (saved) {
      const delivery: Delivery = JSON.parse(saved);
      this.entryForm.patchValue(delivery);
      this.editingId = delivery.id;
      localStorage.removeItem('editDelivery');
    }
  }

  initForm(): void {
    const mobilierControls: { [key: string]: boolean } = {};
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
      Object.keys(this.entryForm.controls).forEach(key => {
        const control = this.entryForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const formValue = this.entryForm.value;
    let dateLivraison = '';
    const date = formValue.dateLivraison;

    if (date instanceof Date) {
      dateLivraison = date.toISOString().split('T')[0];
    } else {
      dateLivraison = formValue.dateLivraison;
    }

    const newDelivery: Delivery = {
      id: this.editingId || 0,
      region: formValue.region,
      localite: formValue.localite || '',
      typePersonnel: formValue.typePersonnel,
      nomPersonnel: formValue.nomPersonnel || '',
      dateLivraison: dateLivraison,
      statut: 'Livré',
      mobiliers: formValue.mobiliers,
      observation: formValue.observation
    };

    if (this.editingId) {
      this.dataService.updateDelivery(newDelivery);
      this.editingId = null;
    } else {
      this.dataService.addDelivery(newDelivery);
    }

    this.entryForm.reset();
    this.initForm();
    this.success = true;

    setTimeout(() => {
      this.success = false;
      this.submitting = false;
    }, 3000);
  }
}
