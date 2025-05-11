export type DeliveryStatus = 'Livré' | 'Non livré' | 'En cours';

export interface Delivery {
  id: number | string;
  region: string;
  localite: string;
  typePersonnel: string;
  nomPersonnel: string;
  dateLivraison: string;
  statut: DeliveryStatus;
  mobiliers: { [key: string]: boolean };
  observation: string;
}

export interface ConfirmedDeliveryItem {
  deliveryId: number | string;
  confirmedDate: string;
  confirmedBy: string;
  comment?: string;
}

export interface MobilierConfirmation {
  mobilierType: string;
  confirmedCount: number;
  confirmedDate: string;
  confirmedBy: string;
  comment?: string;
}

// Mise à jour de l'interface RegionConfirmation
export interface RegionConfirmation {
  id?: number | string;
  region: string;
  dateConfirmation: string;
  responsable: string;
  commentaire: string;
  statut: 'Confirmé' | 'Partiel' | 'Non confirmé';
  equipementsRecus: {
    total: number;
    confirmes: number;
    pourcentage: number;
    detailsParType: {
      [key: string]: {
        total: number;
        confirmes: number;
      }
    }
  };
  confirmedItems: ConfirmedDeliveryItem[];
  mobilierConfirmations?: MobilierConfirmation[];
}

