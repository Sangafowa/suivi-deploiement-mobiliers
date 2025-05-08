export interface Delivery {
  id: number | string;
  region: string;
  localite: string;
  typePersonnel: string;
  nomPersonnel: string;
  dateLivraison: string;
  statut: 'Livré' | 'En cours';
  mobiliers: {
    [key: string]: boolean;
  };
  observation?: string;
}
