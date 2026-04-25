import type { PluginObject } from "../../sdk";

export interface DeliveryMethod {
  objectId: string;
  name: string;
  enabled: boolean;
}

export interface ProductDeliveryData {
  disabledMethods: string[];
}

export function toDeliveryMethod(obj: PluginObject): DeliveryMethod {
  return { objectId: obj.objectId, name: obj.data.name as string, enabled: obj.data.enabled as boolean };
}
