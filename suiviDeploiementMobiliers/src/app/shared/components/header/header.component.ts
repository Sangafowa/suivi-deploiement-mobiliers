import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  title = 'Suivi du Déploiement des Mobiliers';
  subtitle = 'DAAF - Moyens Généraux et Patrimoine  - PRESFOR';
  logoPath = 'assets/logoAfor.png';
}
