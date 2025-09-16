import supportRoutes from "./index";
import { Elysia } from "elysia";

const app = new Elysia()
  .group("/support", (app) => app.use(supportRoutes));

console.log("Support routes loaded successfully");