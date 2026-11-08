export type Role = "retailer" | "desk";
export type Locale = "en" | "hi";
export type Status = "confirmed" | "processing" | "packed" | "cancelled";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  retailerId: string | null;
  shop: string | null;
}
export interface Product {
  id: string;
  name: string;
  nameHi: string;
  brand: string;
  category: string;
  pack: number;
  size: string;
  pricePaise: number;
  stock: number;
  scheme: "free10" | "discount3" | "none";
  art: "biscuit" | "detergent" | "tea" | "soap" | "rice";
}
export interface CartItem {
  sku: string;
  cases: number;
}
export interface QuoteLine extends CartItem {
  name: string;
  nameHi: string;
  pack: number;
  unitPricePaise: number;
  freeCases: number;
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  scheme: Product["scheme"];
}
export interface Quote {
  lines: QuoteLine[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  paidCases: number;
  freeCases: number;
}
export interface Order extends Quote {
  id: string;
  retailerId: string;
  shop: string;
  createdAt: string;
  status: Status;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
