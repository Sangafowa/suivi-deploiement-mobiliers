import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  showInput?: boolean;
  inputLabel?: string;
  commentLabel?: string;
  confirmText: string;
  cancelText: string;
}

export interface ConfirmationDialogResult {
  confirmed: boolean;
  input?: string;
  comment?: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
      <form *ngIf="data.showInput" [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ data.inputLabel || 'Nom' }}</mat-label>
          <input matInput formControlName="input" required>
          <mat-error *ngIf="form.get('input')?.hasError('required')">Ce champ est requis</mat-error>
        </mat-form-field>

        <mat-form-field *ngIf="data.commentLabel" appearance="outline" class="full-width">
          <mat-label>{{ data.commentLabel }}</mat-label>
          <textarea matInput formControlName="comment" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ data.cancelText }}</button>
      <button mat-raised-button
              color="primary"
              [disabled]="data.showInput && form.invalid"
              (click)="confirm()">
        {{ data.confirmText }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-top: 15px;
    }

    mat-dialog-content {
      min-width: 300px;
    }
  `]
})
export class ConfirmationDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ConfirmationDialogComponent, ConfirmationDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {
    this.form = this.fb.group({
      input: ['', data.showInput ? Validators.required : []],
      comment: ['']
    });
  }

  confirm(): void {
    if (this.data.showInput && this.form.invalid) {
      return;
    }

    const result: ConfirmationDialogResult = {
      confirmed: true
    };

    if (this.data.showInput) {
      result.input = this.form.get('input')?.value;
      result.comment = this.form.get('comment')?.value;
    }

    this.dialogRef.close(result);
  }
}
