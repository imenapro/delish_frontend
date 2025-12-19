export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'store_owner' | 'admin' | 'seller' | 'manager';
  storeId?: string;
}

export const mockUsers: MockUser[] = [
  // Super Admin
  {
    id: 'super-1',
    email: 'admin@storesync.com',
    password: 'admin123',
    name: 'Super Admin',
    role: 'super_admin',
  },
  // Store Owners
  {
    id: 'owner-1',
    email: 'owner@bakeryheaven.com',
    password: 'owner123',
    name: 'John Bakery',
    role: 'store_owner',
    storeId: '1',
  },
  {
    id: 'owner-2',
    email: 'owner@sweetdelights.com',
    password: 'owner123',
    name: 'Maria Sweet',
    role: 'store_owner',
    storeId: '2',
  },
  {
    id: 'owner-3',
    email: 'owner@cupcakecorner.com',
    password: 'owner123',
    name: 'Sophie Cupcake',
    role: 'store_owner',
    storeId: '3',
  },
  {
    id: 'owner-4',
    email: 'owner@goldencrust.com',
    password: 'owner123',
    name: 'David Crust',
    role: 'store_owner',
    storeId: '4',
  },
  {
    id: 'owner-5',
    email: 'owner@donutdreams.com',
    password: 'owner123',
    name: 'Emma Donut',
    role: 'store_owner',
    storeId: '5',
  },
  // Store Employees
  {
    id: 'emp-1',
    email: 'manager@bakeryheaven.com',
    password: 'manager123',
    name: 'Manager Heaven',
    role: 'manager',
    storeId: '1',
  },
  {
    id: 'emp-2',
    email: 'seller@sweetdelights.com',
    password: 'seller123',
    name: 'Seller Sweet',
    role: 'seller',
    storeId: '2',
  },
];
