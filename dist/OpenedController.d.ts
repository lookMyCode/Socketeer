import { Controller } from "./controller/Controller";
export interface OpenedController {
    path: string;
    currentPath: string;
    controller: Controller;
}
