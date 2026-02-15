import { Socketeer } from "../../Socketeer";
import { AuthGuard } from "./AuthGuard";
import { CustomErrorFilter } from "./CustomErrorFilter";
import { routes } from "./routes";


const socketeer = new Socketeer({
  port: 3200,
  routes,
  connectGuards: [
    new AuthGuard(),
  ],
  prefixPath: '/ws',
  errorFilter: new CustomErrorFilter(),
  rateLimit: {
    maxConnections: 10,
    maxRequests: {
      counter: 10,
      window: 1000,
    },
  },
  onInit() {
    console.log('==============================');
    console.log('Socketeer, port 3200');
    console.log('==============================');
  },
  onConnect() {
    console.log('=== New connection ===');
  },
});
