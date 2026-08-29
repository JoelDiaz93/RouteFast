import { Body, ConflictException, Controller, Get, Headers, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { OrderNotFoundError } from '../../application/errors/order-not-found.error';
import { CancelOrderUseCase } from '../../application/use-cases/cancel-order.use-case';
import { CreateOrderUseCase } from '../../application/use-cases/create-order.use-case';
import { GetOrderUseCase } from '../../application/use-cases/get-order.use-case';
import { ListOrdersUseCase } from '../../application/use-cases/list-orders.use-case';
import { OrderView } from '../../application/use-cases/order.view';
import { InvalidOrderStateError } from '../../domain/errors/invalid-order-state.error';
import { CreateOrderDto } from './dto/create-order.dto';
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
  ) {}
  @Post()
  create(@Body() body: CreateOrderDto, @Headers('x-correlation-id') correlationId?: string): Promise<OrderView> {
    return this.createOrder.execute({ ...body, correlationId });
  }
  @Get() list(): Promise<OrderView[]> { return this.listOrders.execute(); }
  @Get(':orderId') async getById(@Param('orderId') orderId: string): Promise<OrderView> {
    try { return await this.getOrder.execute(orderId); }
    catch (error) { if (error instanceof OrderNotFoundError) throw new NotFoundException(error.message); throw error; }
  }
  @Patch(':orderId/cancel') async cancel(@Param('orderId') orderId: string): Promise<OrderView> {
    try { return await this.cancelOrder.execute(orderId); }
    catch (error) {
      if (error instanceof OrderNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidOrderStateError) throw new ConflictException(error.message);
      throw error;
    }
  }
}
