import express from 'express';
import { ordersRouter } from './orders';

export const app = express();
app.use(express.json());
app.use(ordersRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`shop-api listening on ${port}`));
