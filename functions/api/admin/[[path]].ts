import { handleAdmin } from "./router";

export const onRequest: PagesFunction = async (ctx) => {
  return handleAdmin(ctx.request, ctx.env, ctx);
};
