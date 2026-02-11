import { Socketeer } from "../Socketeer";
import { routes } from "./routes";


const socketeer = new Socketeer({
  port: 3000,
  routes,
});
