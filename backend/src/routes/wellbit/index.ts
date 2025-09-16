import { Elysia } from 'elysia';
import paymentRoutes from './payment';

export default (app: Elysia) =>
  app
    .use(paymentRoutes);
