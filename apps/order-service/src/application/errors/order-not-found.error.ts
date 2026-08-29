export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} was not found`);
    this.name = 'OrderNotFoundError';
  }
}
