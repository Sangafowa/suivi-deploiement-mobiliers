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
