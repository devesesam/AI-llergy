# Supabase RPC Type Inference Issue

## Problem

When using `@supabase/ssr` (v0.8.0+) with a typed `Database` generic, the `.rpc()` method does **not** properly infer the `Args` type from the `Functions` interface, even when correctly defined in `types.ts`.

TypeScript error:
```
Argument of type '{ code: string; }' is not assignable to parameter of type 'undefined'.
```

## Root Cause

The `createBrowserClient<Database>()` from `@supabase/ssr` doesn't propagate the `Functions` types to the `.rpc()` method signature the same way `@supabase/supabase-js` does. TypeScript sees the parameter type as `undefined` even when `Args` is properly defined.

## Correct Pattern

When calling Supabase RPC functions with parameters, use this pattern:

```typescript
// 1. Define a response interface (can be local or imported from types)
interface MyRpcResponse {
  success?: boolean
  error?: string
  // ... other fields
}

// 2. Cast the argument as `never` and cast the result
const { data, error } = await supabase.rpc('my_rpc_function', {
  param1: value1,
  param2: value2
} as never) as { data: MyRpcResponse | null; error: Error | null }
```

## Why This Works

- `as never` satisfies TypeScript's expectation of `undefined` for the parameter
- The result cast provides proper typing for `data` and `error`
- Runtime behavior is unchanged—only the type system is affected

## Files Affected

- `src/lib/supabase/types.ts` - Contains `Functions` interface (still define your RPCs here for documentation)
- Any component calling `supabase.rpc()` with parameters

## Examples

- [JoinVenueForm.tsx](../src/components/dashboard/JoinVenueForm.tsx) - `join_venue_by_code` RPC
- [new/page.tsx](../src/app/dashboard/venues/new/page.tsx) - `create_venue` RPC

## Alternative Solutions

1. **Regenerate types with Supabase CLI** - May or may not fix the issue depending on version
   ```bash
   supabase gen types typescript --schema public > src/lib/supabase/types.ts
   ```

2. **Use `@supabase/supabase-js` directly** - Has better type inference but loses SSR benefits

3. **Wait for upstream fix** - This is a known limitation in `@supabase/ssr` type inference

## Version Info

- `@supabase/ssr`: ^0.8.0
- `@supabase/supabase-js`: ^2.97.0
- Issue observed: February 2026
