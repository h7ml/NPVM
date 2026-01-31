declare module '@fastify/swagger-ui' {
  import { FastifyPluginAsync } from 'fastify';

  interface FastifySwaggerUiOptions {
    routePrefix?: string;
    uiConfig?: {
      docExpansion?: 'list' | 'full' | 'none';
      deepLinking?: boolean;
    };
    staticCSP?: boolean;
    transformStaticCSP?: (header: string) => string;
  }

  const fastifySwaggerUi: FastifyPluginAsync<FastifySwaggerUiOptions>;
  export default fastifySwaggerUi;
}
