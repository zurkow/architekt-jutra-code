import type { PluginObject } from "../../sdk";

export interface Customer {
  objectId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  taxId: string;
  website: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export function toCustomer(obj: PluginObject): Customer {
  return {
    objectId: obj.objectId,
    firstName: (obj.data.firstName as string) ?? "",
    lastName: (obj.data.lastName as string) ?? "",
    email: (obj.data.email as string) ?? "",
    phone: (obj.data.phone as string) ?? "",
    companyName: (obj.data.companyName as string) ?? "",
    taxId: (obj.data.taxId as string) ?? "",
    website: (obj.data.website as string) ?? "",
    street: (obj.data.street as string) ?? "",
    city: (obj.data.city as string) ?? "",
    postalCode: (obj.data.postalCode as string) ?? "",
    country: (obj.data.country as string) ?? "",
  };
}
