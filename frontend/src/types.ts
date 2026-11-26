export type UserRole = 'Administrator' | 'Inventory Staff' | 'Production Staff';

export interface User {
  id: number;
  email: string | null;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterial {
  id: number;
  materialName: string;
  unit: string;
  description: string | null;
  inventory: Inventory | null;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: number;
  rawMaterial: RawMaterial;
  quantityAvailable: number;
  lastUpdated: string;
}

export type ProductionStatus = 'Completed' | 'In Process';

export interface Production {
  id: number;
  user: User;
  productionDate: string;
  furnitureName: string | null;
  quantityProduced: number;
  productionStatus: ProductionStatus;
}

export interface FinishedProduct {
  id: number;
  production: Production;
  productName: string;
  quantityAvailable: number;
  dateCompleted: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
}
