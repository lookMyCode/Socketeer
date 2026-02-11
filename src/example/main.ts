import { Socketeer } from "../Socketeer";
import { routes } from "./routes";


const socketeer = new Socketeer({
  port: 3200,
  routes,
});
