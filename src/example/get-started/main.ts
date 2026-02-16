import { Socketeer } from "../../Socketeer";
import { routes } from "./routes";


const socketeer = new Socketeer({
  port: 3200,
  routes,
  onInit() {
    console.log('==============================');
    console.log('Socketeer, port 3200');
    console.log('==============================');
  }
});
