import React from 'react';

/**
 * DISCOVERABLE_SERVICES defines the explicit list of microservices allowed to be 
 * discovered and managed via this portal. Services not in this list (like 'user' or 'orchestrator')
 * will be hidden even if they are registered in the Router.
 */
export const DISCOVERABLE_SERVICES = [
  'company',
  'asset',
  'crm',
  'finance',
  'notification',
  'note',
  'agenda',
  'room',
  'category'
];

/**
 * ExtensionRegistry maps microservice IDs to their specialized management components.
 * If a service is in DISCOVERABLE_SERVICES but NOT in this registry, it will use GenericEntityPage.
 * Currently, we are moving towards a pure Model-Driven UI, so this registry is mostly empty.
 */
export const ExtensionRegistry: Record<string, React.ComponentType<any>> = {
  // Add specialized overrides here if needed in the future
};

export const getComponentForService = (serviceId: string, fallback: React.ComponentType<any>) => {
  return ExtensionRegistry[serviceId] || fallback;
};
