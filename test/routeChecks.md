# Check Route Checks

```ts
import { assert, assertFalse, assertObjectMatch, unreachable } from "jsr:@std/assert";
```


## Skips function if no request in input
- route: /noRequest
- ```ts
    unreachable()
```