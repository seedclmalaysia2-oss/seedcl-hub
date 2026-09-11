// The shape @supabase/ssr hands to `setAll`.
//
// Why this exists: `createServerClient`'s `cookies` option is a union type, and
// TypeScript will not contextually type a callback's parameters through a
// union — neither as an arrow property nor as method shorthand. Both forms
// compile to an implicit `any` and `next build` rejects them. So we annotate.
//
// The options fields below are deliberately a SUBSET of Next's ResponseCookie,
// with identical types, so `cookieStore.set(name, value, options)` is provably
// assignable. Declaring the callbacks as method shorthand (not arrow
// properties) keeps parameter checking bivariant, so this narrower type is
// still accepted where @supabase/ssr expects its own wider one.
export type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    priority?: "low" | "medium" | "high";
    partitioned?: boolean;
  };
};
