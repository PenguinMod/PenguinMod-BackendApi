import {
    OpenAPIRegistry,
    OpenApiGeneratorV32,
} from "@asteasolutions/zod-to-openapi";
import { routes } from "../api/v1/routes/routes";

const registry = new OpenAPIRegistry();

for (const route of routes) {
    if (route.endpoint) {
        registry.registerPath(route.endpoint);
    }
}

/*
for (const definition of registry.definitions) {
    try {
        new OpenApiGeneratorV32([definition]).generateComponents();
    } catch (error) {
        console.error(`Definition failed`);
        console.dir(definition, { depth: 5 });
        console.error(error);
    }
}
*/

export const openApiDocument = new OpenApiGeneratorV32(
    registry.definitions,
).generateDocument({
    openapi: "3.2.0",
    info: {
        title: "PenguinMod Backend API Documentation",
        version: "1.0.0",
    },
    servers: [
        {
            url: "https://projects.penguinmod.com",
            description: "Production API",
        },
        // TODO: load from env/if we're prod don't include this
        {
            url: "https://localhost:8080",
            description: "Your local API, probably",
        },
    ],
});
