import type { PluginObject } from "../../sdk";

export interface Cart {
  objectId: string;
  customerId: string;
  customerName: string;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  createdAt: string;
}

export interface CartItem {
  objectId: string;
  cartId: string;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface CustomerSummary {
  objectId: string;
  firstName: string;
  lastName: string;
}

export function toCart(obj: PluginObject): Cart {
  return {
    objectId: obj.objectId,
    customerId: obj.data.customerId as string,
    customerName: obj.data.customerName as string,
    status: obj.data.status as Cart["status"],
    createdAt: obj.data.createdAt as string,
  };
}

export function toCartItem(obj: PluginObject): CartItem {
  return {
    objectId: obj.objectId,
    cartId: obj.data.cartId as string,
    productId: obj.data.productId as number,
    productName: obj.data.productName as string,
    quantity: obj.data.quantity as number,
    unitPrice: obj.data.unitPrice as number,
  };
}

export function toCustomerSummary(raw: {
  objectId: string;
  data: { firstName: string; lastName: string };
}): CustomerSummary {
  return {
    objectId: raw.objectId,
    firstName: raw.data.firstName,
    lastName: raw.data.lastName,
  };
}
