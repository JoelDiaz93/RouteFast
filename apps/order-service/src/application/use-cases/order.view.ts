import { Order } from '../../domain/entities/order.aggregate';

export interface OrderView {
  id: string;
  customerId: string;
  priority: string;
  status: string;
  pickup: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoff: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const toOrderView = (order: Order): OrderView => ({
  id: order.id,
  customerId: order.customerId,
  priority: order.priority,
  status: order.status,
  pickup: {
    label: order.pickup.label,
    address: order.pickup.address,
    latitude: order.pickup.coordinates.latitude,
    longitude: order.pickup.coordinates.longitude,
  },
  dropoff: {
    label: order.dropoff.label,
    address: order.dropoff.address,
    latitude: order.dropoff.coordinates.latitude,
    longitude: order.dropoff.coordinates.longitude,
  },
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
});
